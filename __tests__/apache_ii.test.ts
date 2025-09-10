import { test, expect } from "@jest/globals";
import { runAPACHEII } from "../lib/medical/engine/calculators/apache_ii";

test("APACHE II basic high-risk case", () => {
  const out = runAPACHEII({
    temp_c: 39.5, map_mmHg: 55, hr_bpm: 145, rr_bpm: 36,
    fio2_frac: 0.4, pao2_mmHg: 58,
    arterial_pH: 7.22, sodium_mEq_L: 128, potassium_mEq_L: 6.2,
    creatinine_mg_dL: 2.2, acute_renal_failure: true,
    hematocrit_pct: 28, wbc_k_per_uL: 22, gcs: 10,
    age_years: 72, chronic_severe_org_insuff_or_immunocomp: true, admission_category: "nonoperative"
  });
  expect(out.aps_points).toBeGreaterThan(25);
  expect(out.age_points).toBe(5);
  expect(out.chronic_health_points).toBe(5);
  expect(out.total_points).toBeGreaterThan(35);
});
