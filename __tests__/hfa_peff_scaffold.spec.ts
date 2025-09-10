import { runHFAPEFF } from "../lib/medical/engine/calculators/hfa_peff_scaffold";

test("HFA-PEFF scaffold", ()=>{ const o=runHFAPEFF({morphology_pts:2,function_pts:1,biomarkers_pts:2})!; expect(o.HFA_PEFF_total).toBe(5); });
