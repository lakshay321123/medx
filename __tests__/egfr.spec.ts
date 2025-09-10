import { runEGFR } from "../lib/medical/engine/calculators/egfr";

test("eGFR CKD-EPI 2021", ()=>{ const o=runEGFR({method:"CKD_EPI_2021",sex:"female",age_years:60,scr_mg_dL:1.0})!; expect(o.eGFR_mL_min_1_73m2).toBeGreaterThan(50); });
