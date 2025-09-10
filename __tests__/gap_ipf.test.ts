import { runGAP } from "../lib/medical/engine/calculators/gap_ipf";

test("GAP staging", () => {
  const g = runGAP({ male: true, age_years: 68, fvc_pct_pred: 60, dlco_pct_pred: 30 });
  expect(g.gap_points).toBeGreaterThanOrEqual(1);
  expect([1,2,3]).toContain(g.stage);
});
