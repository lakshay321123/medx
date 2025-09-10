import { runPELD } from "../lib/medical/engine/calculators/peld";

test("PELD", ()=>{ const o=runPELD({bilirubin_mg_dL:5,inr:2.0,albumin_g_dL:3.0,age_years:0.8,growth_failure:true})!; expect(o.PELD).toBeGreaterThan(0); });
