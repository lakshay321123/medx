import { runQPitt } from "../lib/medical/engine/calculators/qpitt";
test("qPitt high risk when >=2", ()=>{
  const out = runQPitt({ temp_c:35.5, sbp_mmHg:85, rr_per_min:30, altered_mental_status:false, invasive_mech_vent:false, cardiac_arrest:false });
  expect(out.points).toBeGreaterThanOrEqual(2);
  expect(out.high_risk).toBe(true);
});
