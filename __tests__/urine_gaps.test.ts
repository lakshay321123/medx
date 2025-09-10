
import { test, expect } from "@jest/globals";
import { runUrineGaps } from "../lib/medical/engine/calculators/urine_gaps";

test("Urine gaps basic", () => {
  const out = runUrineGaps({ urine_na_mEq_L:40, urine_k_mEq_L:20, urine_cl_mEq_L:70, urine_osm_measured_mOsm_kg:500, urine_urea_mg_dL:400, urine_glucose_mg_dL:0 });
  expect(out.urine_anion_gap_mEq_L).toBe(-10);
  expect(out.calc_urine_osm_mOsm_kg).toBeGreaterThan(0);
  expect(out.urine_osm_gap_mOsm_kg).not.toBeNull();
});
