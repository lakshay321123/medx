// Batch 14 test
import { calc_bisap } from "../lib/medical/engine/calculators/bisap";

describe("calc_bisap", () => {
  it("flags high risk at >=3", () => {
    const r = calc_bisap({ bun_mg_dl: 30, gcs: 14, sirs_criteria_count: 2, age_years: 65, pleural_effusion: false });
    expect(r.score).toBeGreaterThanOrEqual(3);
    expect(r.high_risk).toBe(true);
  });
});
