import { runH2FPEF } from "../lib/medical/engine/calculators/h2fpef";

test("H2FPEF bands", ()=>{ const o=runH2FPEF({bmi_kg_m2:32,anti_htn_meds_count:2,afib:true,pasp_mmHg:40,age_years:70,e_over_e_prime:10})!; expect(o.probability_band).toBe("high"); });
