import { runSCORTEN } from "../lib/medical/engine/calculators/scorten";

test("SCORTEN", ()=>{ const o=runSCORTEN({age_years:60,hr_bpm:130,cancer:false,epidermal_detachment_pct:15,serum_urea_mmol_L:12,glucose_mmol_L:16,bicarb_mEq_L:18})!; expect(o.SCORTEN).toBeGreaterThanOrEqual(4); });
