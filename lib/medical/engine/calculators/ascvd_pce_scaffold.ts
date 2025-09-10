import { register } from "../registry";

/**
 * ASCVD 10‑yr risk (scaffold): returns {needs} by default—wire to Pooled Cohort Equation coefficients per sex/race.
 */
export function runASCVD_PCE(i:{ sex:"male"|"female", age_years:number, total_chol_mg_dL:number, hdl_mg_dL:number, sbp_mmHg:number, on_treatment_htn:boolean, smoker:boolean, diabetes:boolean }){
  return { needs:["PCE coefficients by sex/ethnicity"], note:"Scaffold—plug in official coefficients to compute risk %." };
}
register({ id:"ascvd_pce_scaffold", label:"ASCVD 10‑yr risk (scaffold)", inputs:[
  {key:"sex",required:true},{key:"age_years",required:true},{key:"total_chol_mg_dL",required:true},{key:"hdl_mg_dL",required:true},
  {key:"sbp_mmHg",required:true},{key:"on_treatment_htn",required:true},{key:"smoker",required:true},{key:"diabetes",required:true}
], run: runASCVD_PCE as any });
