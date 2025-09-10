import { runAIMS65 } from "../lib/medical/engine/calculators/aims65";

test("AIMS65", ()=>{ const o=runAIMS65({albumin_g_dL:2.8,inr:1.6,mental_status_altered:true,sbp_mmHg:85,age_years:72})!; expect(o.AIMS65).toBe(5); });
