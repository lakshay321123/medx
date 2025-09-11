// Batch 14 test
import { calc_baux } from "../lib/medical/engine/calculators/baux_burn";

describe("calc_baux", () => {
  it("adds age + TBSA and +17 for inhalation", () => {
    const r = calc_baux({ age_years: 40, tbsa_percent: 30, inhalation_injury: true });
    expect(r.baux).toBe(70);
    expect(r.revised_baux).toBe(87);
  });
});
