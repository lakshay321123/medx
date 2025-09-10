import { register } from "../registry";

/**
 * SAPS II (simplified). Computes point sum; no mortality mapping included here.
 */
export function runSAPSII(i:{ age_years:number, hr_bpm:number, sbp_mmHg:number, temp_c:number, GCS:number, pao2_mmHg?:number, fio2?:number, bun_mg_dL:number, urine_mL_day:number, sodium_mEq_L:number, potassium_mEq_L:number, bicarb_mEq_L:number, bilirubin_mg_dL:number, cancer_metastatic:boolean, hematologic_malignancy:boolean, aids:boolean, type_of_admission:"scheduled_surgery"|"unscheduled_surgery"|"medical" }){
  if (i==null) return null;
  let s=0;
  s += i.age_years>=75?26 : i.age_years>=60?12 : i.age_years>=40?7 : 0;
  s += i.hr_bpm>=160?7 : i.hr_bpm>=120?5 : i.hr_bpm>=70?0 : i.hr_bpm>=40?2 : 4;
  s += i.sbp_mmHg<70?13 : i.sbp_mmHg<100?5 : 0;
  s += i.temp_c<39?0 : 3;
  s += (15 - (i.GCS||15)) * 2;
  if (i.pao2_mmHg!=null && i.fio2!=null && i.fio2>=0.5){
    const pfr=i.pao2_mmHg/i.fio2;
    s += pfr<199?11:0;
  }
  s += i.bun_mg_dL>85?6 : i.bun_mg_dL>28?4 : 0;
  s += i.urine_mL_day<500?11 : i.urine_mL_day<1000?4 : 0;
  s += i.sodium_mEq_L<125?5 : i.sodium_mEq_L>145?1 : 0;
  s += i.potassium_mEq_L<3?3 : i.potassium_mEq_L>5?3 : 0;
  s += i.bicarb_mEq_L<20?3 : 0;
  s += i.bilirubin_mg_dL>12?9 : i.bilirubin_mg_dL>6?6 : i.bilirubin_mg_dL>2?4 : 0;
  s += i.cancer_metastatic?9:0;
  s += i.hematologic_malignancy?10:0;
  s += i.aids?17:0;
  s += i.type_of_admission==="scheduled_surgery"?0 : i.type_of_admission==="unscheduled_surgery"?8 : 6;
  return { SAPS_II: s };
}
register({ id:"saps_ii", label:"SAPS II (simplified)", inputs:[
  {key:"age_years",required:true},{key:"hr_bpm",required:true},{key:"sbp_mmHg",required:true},{key:"temp_c",required:true},{key:"GCS",required:true},
  {key:"pao2_mmHg"},{key:"fio2"},{key:"bun_mg_dL",required:true},{key:"urine_mL_day",required:true},{key:"sodium_mEq_L",required:true},
  {key:"potassium_mEq_L",required:true},{key:"bicarb_mEq_L",required:true},{key:"bilirubin_mg_dL",required:true},
  {key:"cancer_metastatic",required:true},{key:"hematologic_malignancy",required:true},{key:"aids",required:true},
  {key:"type_of_admission",required:true}
], run: runSAPSII as any });
