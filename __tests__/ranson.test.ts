import { test, expect } from "@jest/globals";
import { runRansonAdmission, runRanson48h } from "../lib/medical/engine/calculators/ranson";

test("Ranson admission (non-gallstone)", () => {
  const out = runRansonAdmission({ etiology:"non_gallstone", age_years:60, wbc_k:17, glucose_mg_dl:210, ast_u_l:300, ldh_u_l:500 });
  expect(out.points).toBeGreaterThanOrEqual(4);
});

test("Ranson 48h", () => {
  const out = runRanson48h({ hct_drop_pct:12, bun_increase_mg_dl:6, calcium_mg_dl:7.5, pao2_mmHg:55, base_deficit_mEq_L:5, fluid_sequestration_L:7 });
  expect(out.points).toBe(6);
});
