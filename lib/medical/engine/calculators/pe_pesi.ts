
import { register } from "../registry";

export type PESIInputs = {
  age_years:number, male:boolean,
  cancer:boolean, heart_failure:boolean, chronic_lung_disease:boolean,
  hr_bpm:number, sbp_mmHg:number, rr_bpm:number, temp_c:number,
  altered_mental_status:boolean, SaO2_pct:number
};

export function runPESI(i:PESIInputs){
  if (i==null) return null;
  let score = i.age_years;
  if (i.male) score += 10;
  if (i.cancer) score += 30;
  if (i.heart_failure) score += 10;
  if (i.chronic_lung_disease) score += 10;
  if (i.hr_bpm>109) score += 20;
  if (i.sbp_mmHg<100) score += 30;
  if (i.rr_bpm>29) score += 20;
  if (i.temp_c<36) score += 20;
  if (i.altered_mental_status) score += 60;
  if (i.SaO2_pct<90) score += 20;
  let classLabel = "I"; // ≤65
  if (score>65 && score<=85) classLabel="II";
  else if (score<=105) classLabel="III";
  else if (score<=125) classLabel="IV";
  else classLabel="V";
  return { PESI: score, risk_class: classLabel };
}

export function runSPESI(i:{ age_gt80:boolean, cancer:boolean, heart_failure_or_pulm_disease:boolean, hr_ge110:boolean, sbp_lt100:boolean, SaO2_lt90:boolean }){
  if (i==null) return null;
  const pts = (i.age_gt80?1:0)+(i.cancer?1:0)+(i.heart_failure_or_pulm_disease?1:0)+(i.hr_ge110?1:0)+(i.sbp_lt100?1:0)+(i.SaO2_lt90?1:0);
  return { sPESI: pts, low_risk: pts===0 };
}

register({ id:"pesi_full", label:"PESI (full)", inputs:[
  {key:"age_years",required:true},{key:"male",required:true},{key:"cancer",required:true},{key:"heart_failure",required:true},{key:"chronic_lung_disease",required:true},
  {key:"hr_bpm",required:true},{key:"sbp_mmHg",required:true},{key:"rr_bpm",required:true},{key:"temp_c",required:true},
  {key:"altered_mental_status",required:true},{key:"SaO2_pct",required:true}
], run: runPESI as any });

register({ id:"spesi", label:"sPESI", inputs:[
  {key:"age_gt80",required:true},{key:"cancer",required:true},{key:"heart_failure_or_pulm_disease",required:true},
  {key:"hr_ge110",required:true},{key:"sbp_lt100",required:true},{key:"SaO2_lt90",required:true}
], run: runSPESI as any });
