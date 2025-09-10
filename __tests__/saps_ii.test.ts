import { test, expect } from "@jest/globals";
import { runSAPSII } from "../lib/medical/engine/calculators/saps_ii";

test("SAPS II example with multiple derangements", () => {
  const out = runSAPSII({
    age_years: 76, hr_bpm: 165, sbp_mmHg: 85, temp_c: 33.5,
    gcs: 8, pf_ratio: 120, urine_output_mL_24h: 400,
    wbc_k_per_uL: 22, potassium_mEq_L: 6.1, sodium_mEq_L: 122, bicarbonate_mEq_L: 14, bilirubin_mg_dL: 7.0,
    admission_type: "medical", aids: false, metastatic_cancer: true, hematologic_malignancy: false
  });
  expect(out.total_points).toBeGreaterThan(60);
  expect(out.components.gcs).toBeGreaterThan(0);
});
