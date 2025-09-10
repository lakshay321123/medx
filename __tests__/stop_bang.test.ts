import { runSTOPBANG } from "../lib/medical/engine/calculators/stop_bang";

test("STOP-Bang intermediate", () => {
  const s = runSTOPBANG({ snoring_loud:true, tired_daytime:true, observed_apnea:false, high_bp_history:true,
    bmi_kg_m2: 36, age_years: 55, neck_circumference_cm: 41, male: true });
  expect(s.stopbang_points).toBeGreaterThanOrEqual(6);
  expect(["intermediate","high"]).toContain(s.risk_band);
});
