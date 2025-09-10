import { register } from "../registry";

/**
 * CRUSADE bleeding score (NSTE-ACS). Category points approximated per published bins.
 * Inputs: baseline hematocrit %, creatinine clearance (mL/min), HR, SBP, female, signs of CHF, prior vascular disease, diabetes.
 * Returns total and risk band.
 */
export type CRUSADEInputs = {
  hct_pct:number, crcl_mL_min:number, hr_bpm:number, sbp_mmHg:number,
  female:boolean, signs_of_chf:boolean, prior_vascular_disease:boolean, diabetes:boolean
};
export function runCRUSADE(i:CRUSADEInputs){
  if ([i.hct_pct,i.crcl_mL_min,i.hr_bpm,i.sbp_mmHg].some(v=>v==null || !isFinite(v as number))) return null;
  let pts = 0;
  // Hematocrit
  if (i.hct_pct<31) pts+=9; else if (i.hct_pct<36) pts+=7; else if (i.hct_pct<39) pts+=3; else if (i.hct_pct<42) pts+=1;
  // CrCl
  if (i.crcl_mL_min<15) pts+=39; else if (i.crcl_mL_min<30) pts+=28; else if (i.crcl_mL_min<45) pts+=17; else if (i.crcl_mL_min<60) pts+=7; else if (i.crcl_mL_min<75) pts+=3;
  // HR
  if (i.hr_bpm>=110) pts+=7; else if (i.hr_bpm>=90) pts+=4; else if (i.hr_bpm>=70) pts+=2;
  // SBP
  if (i.sbp_mmHg<90) pts+=10; else if (i.sbp_mmHg<110) pts+=8; else if (i.sbp_mmHg<130) pts+=5; else if (i.sbp_mmHg<150) pts+=2;
  if (i.female) pts+=8;
  if (i.signs_of_chf) pts+=7;
  if (i.prior_vascular_disease) pts+=6;
  if (i.diabetes) pts+=6;
  let band = "very low";
  if (pts>=51) band="very high"; else if (pts>=41) band="high"; else if (pts>=31) band="intermediate"; else if (pts>=21) band="low";
  return { CRUSADE: pts, risk_band: band };
}
register({ id:"crusade_bleeding", label:"CRUSADE bleeding (NSTE‑ACS)", inputs:[
  {key:"hct_pct",required:true},{key:"crcl_mL_min",required:true},{key:"hr_bpm",required:true},{key:"sbp_mmHg",required:true},
  {key:"female",required:true},{key:"signs_of_chf",required:true},{key:"prior_vascular_disease",required:true},{key:"diabetes",required:true}
], run: runCRUSADE as any });
