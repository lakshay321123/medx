import { runOttawaSAH } from "@/lib/medical/engine/calculators/ottawa_sah_rule";

test("Ottawa SAH high risk flag", () => {
  const r = runOttawaSAH({ age:45, neck_pain_or_stiffness:false, witnessed_loc:false, onset_during_exertion:false, thunderclap_onset:false, limited_neck_flexion:false });
  expect(r.high_risk).toBe(true);
});
