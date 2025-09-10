import { test, expect } from "@jest/globals";
import { runMurrayLIS } from "../lib/medical/engine/calculators/murray_ards";

test("Murray LIS averages components", () => {
  const out = runMurrayLIS({ cxr_quadrants_involved: 3, pf_ratio: 160, peep_cmH2O: 12, compliance_mL_per_cmH2O: 30 });
  // CXR=3, PF=3, PEEP=3, Compliance=3 => LIS 3.0
  expect(out.lis).toBe(3);
  expect(out.component_points.pf).toBe(3);
});
