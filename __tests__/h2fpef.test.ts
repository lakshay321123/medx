import { runH2FPEF } from "../lib/medical/engine/calculators/h2fpef";

test("H2FPEF high", () => {
  const h = runH2FPEF({ bmi_kg_m2: 34, antihypertensive_meds_count: 3, atrial_fibrillation: true, pasp_mmHg: 45, age_years: 72, e_over_eprime_avg: 12 });
  expect(h.h2fpef_points).toBeGreaterThanOrEqual(7);
  expect(h.probability_band).toBe("high");
});
