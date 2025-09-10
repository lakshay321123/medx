import { runSMARTCOP } from "../lib/medical/engine/calculators/smart_cop";

test("SMART-COP very high risk example", () => {
  const out = runSMARTCOP({
    age_years: 55,
    sbp_mmHg: 85,
    multilobar_infiltrates: true,
    albumin_g_dL: 3.0,
    rr_per_min: 32,
    hr_bpm: 130,
    confusion: true,
    spo2_perc: 88,
    ph_arterial: 7.32,
  });
  // Expected total 11
  expect(out.score).toBe(11);
  expect(out.risk).toBe("Very high");
});
