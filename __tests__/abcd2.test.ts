import { calc_abcd2 } from "../lib/medical/engine/calculators/abcd2";

describe("calc_abcd2", () => {
  it("scores per rule", () => {
    const v = calc_abcd2({ age_ge_60: true, sbp_ge_140_or_dbp_ge_90: true, unilateral_weakness: false, speech_disturbance_without_weakness: true, duration_ge_60min: false, duration_10_to_59min: true, diabetes: true });
    expect(v).toBe(6);
  });
});
