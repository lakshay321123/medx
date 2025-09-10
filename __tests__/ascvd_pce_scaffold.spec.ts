import { runASCVD_PCE } from "../lib/medical/engine/calculators/ascvd_pce_scaffold";

test("ASCVD scaffold", ()=>{ const o=runASCVD_PCE({sex:"male",age_years:60,total_chol_mg_dL:200,hdl_mg_dL:50,sbp_mmHg:130,on_treatment_htn:false,smoker:false,diabetes:false})!; expect(o.needs).toBeDefined(); });
