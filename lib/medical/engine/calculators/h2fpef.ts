import { register } from "../registry";

export type H2FPEFInputs = {
  bmi_kg_m2:number, anti_htn_meds_count:number, afib:boolean,
  pasp_mmHg:number, age_years:number, e_over_e_prime:number
};
export function runH2FPEF(i:H2FPEFInputs){
  if ([i.bmi_kg_m2,i.anti_htn_meds_count,i.pasp_mmHg,i.age_years,i.e_over_e_prime].some(v=>v==null || !isFinite(v as number))) return null;
  let pts = 0;
  if (i.bmi_kg_m2>30) pts += 2;
  if (i.anti_htn_meds_count>=2) pts += 1;
  if (i.afib) pts += 3;
  if (i.pasp_mmHg>35) pts += 1;
  if (i.age_years>60) pts += 1;
  if (i.e_over_e_prime>9) pts += 1;
  let prob = "low"; if (pts>=6) prob="high"; else if (pts>=3) prob="intermediate";
  return { H2FPEF: pts, probability_band: prob };
}
register({ id:"h2fpef", label:"H2FPEF", inputs:[
  {key:"bmi_kg_m2",required:true},{key:"anti_htn_meds_count",required:true},{key:"afib",required:true},
  {key:"pasp_mmHg",required:true},{key:"age_years",required:true},{key:"e_over_e_prime",required:true}
], run: runH2FPEF as any });
