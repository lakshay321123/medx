import { register } from "../registry";

/**
 * APACHE II (core). Provide worst values in first 24h. Returns total (APS+age+chronic health).
 * Missing inputs -> returns {needs:[...]}
 */
export type APACHEInputs = {
  temp_c:number, map_mmHg:number, hr_bpm:number, rr_bpm:number, aoa:number, // A-a gradient OR alveolar-oxygen, supply A-a or PaO2
  pao2_mmHg?:number, fio2?:number, aa_gradient_mmHg?:number,
  ph:number, sodium_mEq_L:number, potassium_mEq_L:number, creat_mg_dL:number, hematocrit_pct:number, wbc_k_uL:number,
  gcs:number,
  age_years:number,
  chronic_organ_insufficiency:boolean, post_op:boolean
};
export function runAPACHEII(i:APACHEInputs){
  const needs:string[]=[];
  function need(k:string,v:any){ if(v==null || (typeof v==='number' && !isFinite(v))) needs.push(k); }
  ["temp_c","map_mmHg","hr_bpm","rr_bpm","ph","sodium_mEq_L","potassium_mEq_L","creat_mg_dL","hematocrit_pct","wbc_k_uL","gcs","age_years"].forEach(k=>need(k,(i as any)[k]));
  if (!((i.aa_gradient_mmHg!=null && isFinite(i.aa_gradient_mmHg)) || (i.pao2_mmHg!=null && isFinite(i.pao2_mmHg)))) needs.push("aa_gradient_mmHg or pao2_mmHg");
  if (needs.length) return { needs };

  function rangeScore(val:number, ranges:[number,number,number][], default0=true){
    for (const [min,max,score] of ranges) if (val>=min && val<=max) return score;
    return default0?0:0;
  }

  let aps=0;
  // Temperature (rectal, C)
  aps += rangeScore(i.temp_c, [[41, 100, 4],[39,40.9,3],[38.5,38.9,1],[36,38.4,0],[34,35.9,1],[32,33.9,2],[30,31.9,3],[-100,29.9,4]]);
  // MAP
  aps += rangeScore(i.map_mmHg, [[160,1000,4],[130,159,3],[110,129,2],[70,109,0],[50,69,2],[-100,49,4]]);
  // HR
  aps += rangeScore(i.hr_bpm, [[180,1000,4],[140,179,3],[110,139,2],[70,109,0],[55,69,2],[40,54,3],[-100,39,4]]);
  // RR
  aps += rangeScore(i.rr_bpm, [[50,1000,4],[35,49,3],[25,34,1],[12,24,0],[10,11,1],[6,9,2],[-100,5,4]]);
  // Oxygenation: A-a gradient if FiO2>=0.5 else PaO2
  if (i.aa_gradient_mmHg!=null && isFinite(i.aa_gradient_mmHg)){
    aps += rangeScore(i.aa_gradient_mmHg, [[500,10000,4],[350,499,3],[200,349,2],[0,199,0]]);
  } else {
    const pao2=i.pao2_mmHg as number;
    aps += rangeScore(pao2, [[70,10000,0],[61,70,1],[55,60,3],[-100,54,4]]);
  }
  // Arterial pH
  aps += rangeScore(i.ph, [[7.7,10,4],[7.6,7.69,3],[7.5,7.59,1],[7.33,7.49,0],[7.25,7.32,2],[7.15,7.24,3],[-10,7.14,4]]);
  // Na
  aps += rangeScore(i.sodium_mEq_L, [[180,400,4],[160,179,3],[155,159,2],[150,154,1],[130,149,0],[120,129,2],[111,119,3],[-100,110,4]]);
  // K
  aps += rangeScore(i.potassium_mEq_L, [[7,20,4],[6,6.9,3],[5.5,5.9,1],[3.5,5.4,0],[3,3.4,1],[2.5,2.9,2],[-10,2.4,4]]);
  // Creatinine (no ARF bonus here—keep simple)
  aps += rangeScore(i.creat_mg_dL, [[3.5,100,4],[2,3.4,3],[1.5,1.9,2],[0.6,1.4,0],[-100,0.5,2]]);
  // Hct
  aps += rangeScore(i.hematocrit_pct, [[60,100,4],[50,59.9,2],[46,49.9,1],[30,45.9,0],[20,29.9,2],[-100,19.9,4]]);
  // WBC
  aps += rangeScore(i.wbc_k_uL, [[40,1000,4],[20,39.9,2],[15,19.9,1],[3,14.9,0],[1,2.9,2],[-100,0.9,4]]);
  // GCS
  aps += (15 - i.gcs);

  // Age
  let agePts=0;
  agePts += i.age_years>=75?6 : i.age_years>=65?5 : i.age_years>=55?3 : i.age_years>=45?2 : 0;

  // Chronic health
  const chronic = (i.chronic_organ_insufficiency && i.post_op)?2 : (i.chronic_organ_insufficiency?5:0);

  const total = aps + agePts + chronic;
  return { APACHE_II: total, APS: aps, agePts, chronicPts: chronic };
}
register({ id:"apache_ii", label:"APACHE II", inputs:[
  {key:"temp_c",required:true},{key:"map_mmHg",required:true},{key:"hr_bpm",required:true},{key:"rr_bpm",required:true},
  {key:"pao2_mmHg"},{key:"fio2"},{key:"aa_gradient_mmHg"},
  {key:"ph",required:true},{key:"sodium_mEq_L",required:true},{key:"potassium_mEq_L",required:true},{key:"creat_mg_dL",required:true},
  {key:"hematocrit_pct",required:true},{key:"wbc_k_uL",required:true},{key:"gcs",required:true},{key:"age_years",required:true},
  {key:"chronic_organ_insufficiency",required:true},{key:"post_op",required:true}
], run: runAPACHEII as any });
