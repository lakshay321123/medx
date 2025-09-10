import { runCSRS } from "../lib/medical/engine/calculators/canadian_syncope";

test("CSRS computes", ()=>{ const o=runCSRS({predisposition_vasovagal:false,history_of_heart_disease:true,sbp_extreme:true,elevated_troponin:true,abnormal_qrs_axis:false,qrs_duration_gt130:false,qtc_gt480:true,shortness_of_breath:true})!; expect(o.CSRS).toBeGreaterThan(0); });
