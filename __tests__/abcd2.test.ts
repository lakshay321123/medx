import { calc_abcd2 } from "../lib/medical/engine/calculators/abcd2";

describe("calc_abcd2", () => {
  it("scores weakness + long duration as high", () => {
    const r = calc_abcd2({ age_ge_60: true, bp_ge_140_90: false, clinical_weakness: true, clinical_speech_impairment_no_weakness: false, duration_ge_60min: true, duration_10_to_59: false, diabetes: true });
    expect(r.score).toBeGreaterThanOrEqual(6);
    expect(r.risk).toBe("high");
  });
});
