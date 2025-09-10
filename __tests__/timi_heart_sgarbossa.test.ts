import { runTIMI_UA_NSTEMI, runTIMI_STEMI, runHEART, runSmithModifiedSgarbossa } from "../lib/medical/engine/calculators/cardio_tools";

test("TIMI UA/NSTEMI", () => {
  const out = runTIMI_UA_NSTEMI({ age_ge_65: true, risk_factors_ge_3: true, known_cad_ge_50: false, aspirin_7d: false, severe_angina_ge_2_24h: true, st_deviation_ge_0_5mm: true, positive_markers: true });
  expect(out.score).toBeGreaterThan(0);
});

test("TIMI STEMI", () => {
  const out = runTIMI_STEMI({ age_years: 70, diabetes_htn_or_angina: true, sbp_lt_100: false, hr_gt_100: true, killip_II_to_IV: true, weight_lt_67kg: false, anterior_STEMI_or_LBBB: true, time_to_treatment_gt_4h: false });
  expect(out.score).toBeGreaterThan(0);
});

test("HEART", () => {
  const out = runHEART({ history: 1, ecg: 1, age_years: 62, risk_factors_count: 2, troponin_band: 1 });
  expect(out.score).toBeGreaterThanOrEqual(0);
});

test("Modified Sgarbossa", () => {
  const out = runSmithModifiedSgarbossa({ concordant_ST_elevation_mm: 0, concordant_ST_depression_V1toV3_mm: 0, st_deviation_mm: -5, s_wave_depth_mm: 20 });
  expect(out.positive).toBeDefined();
});
