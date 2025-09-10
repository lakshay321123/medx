import { runFourTs } from "../lib/medical/engine/calculators/four_ts_hit";

test("4Ts mid/high", ()=>{ const o=runFourTs({platelet_drop_pct:55,nadir_k_uL:30,timing_days:7,thrombosis_or_skin:true,other_causes_likely:false})!; expect(o.probability_band).not.toBe("low"); });
