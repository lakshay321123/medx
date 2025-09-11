import { calc_abcd2 } from "../lib/medical/engine/calculators/abcd2_tia";

describe("calc_abcd2", () => {
  it("scores duration & features", () => {
    const r = calc_abcd2({ age_ge_60: true, sbp_ge_140_or_dbp_ge_90: true, unilateral_weakness: false, speech_impairment_without_weakness: true, duration_min: 65, diabetes: true });
    expect(r.score).toBeGreaterThanOrEqual(5);
    expect(["moderate","high"]).toContain(r.risk);
  });
});
