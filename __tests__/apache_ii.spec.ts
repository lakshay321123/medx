import { runAPACHEII } from "../lib/medical/engine/calculators/apache_ii";

test("APACHE II completes with typical ICU values", () => {
  const out = runAPACHEII({
    temp_c: 38.2,
    map_mmHg: 75,
    hr_bpm: 120,
    rr_bpm: 28,
    fio2: 0.4,
    pao2_mmHg: 80,
    ph_arterial: 7.31,
    sodium_mEq_L: 140,
    potassium_mEq_L: 4.2,
    creat_mg_dL: 1.2,
    creat_acute_renal_failure: false,
    hematocrit_pct: 36,
    wbc_k_uL: 12,
    gcs: 13,
    age_years: 67,
    has_severe_chronic_illness: true,
    admission_type: "nonoperative",
  });
  expect(out.missing.length).toBe(0);
  expect(out.aps_points).toBeGreaterThan(0);
  expect(out.age_points).toBe(5);
  expect(out.total).toBeGreaterThan(0);
});
