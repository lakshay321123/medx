import { runTroponinDelta } from "../lib/medical/engine/calculators/troponin_delta";

test("Troponin delta", ()=>{ const o=runTroponinDelta({baseline_ng_L:8,repeat_ng_L:20,absolute_cutoff_ng_L:5,relative_pct_cutoff:20})!; expect(o.positive).toBe(true); });
