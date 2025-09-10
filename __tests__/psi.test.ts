import { runPSI } from "../lib/medical/engine/calculators/psi";

test("PSI class IV/V for high-risk features", () => {
  const p = runPSI({
    age_years: 78, female: false, nursing_home_resident: true,
    neoplastic_disease: true, chf: true, renal_disease: true,
    altered_mental_status: true, respiratory_rate_ge_30: true, sbp_lt_90: true, temp_c: 34.5, pulse_ge_125: true,
    ph_lt_7_35: true, bun_mg_dL: 45, sodium_mEq_L: 128, glucose_mg_dL: 280, hematocrit_pct: 28,
    pao2_mmHg: 55, pleural_effusion: true
  });
  expect(p.psi_points).toBeGreaterThanOrEqual(131);
  expect(p.psi_class).toBe("V");
});
