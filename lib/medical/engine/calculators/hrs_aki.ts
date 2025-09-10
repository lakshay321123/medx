import { register } from "../registry";

/**
 * HRS‑AKI supportive criteria (ICA). Returns supportive:true if pattern fits HRS assumptions.
 */
export function runHRS_AKI(i:{ cirrhosis_with_ascites:boolean, aki_stage_ge1:boolean, shock_present:boolean, nephrotoxin_exposure:boolean, structural_kidney_disease:boolean, no_creat_improve_after_albumin:boolean }){
  if (i==null) return null;
  const supportive = i.cirrhosis_with_ascites && i.aki_stage_ge1 && !i.shock_present && !i.nephrotoxin_exposure && !i.structural_kidney_disease && i.no_creat_improve_after_albumin;
  return { HRS_AKI_supportive: supportive };
}
register({ id:"hrs_aki_support", label:"HRS‑AKI supportive pattern", inputs:[
  {key:"cirrhosis_with_ascites",required:true},{key:"aki_stage_ge1",required:true},{key:"shock_present",required:true},
  {key:"nephrotoxin_exposure",required:true},{key:"structural_kidney_disease",required:true},{key:"no_creat_improve_after_albumin",required:true}
], run: runHRS_AKI as any });
