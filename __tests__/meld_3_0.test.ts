import { calc_meld_3_0 } from "../lib/medical/engine/calculators/meld_3_0";

describe("calc_meld_3_0", () => {
  it("respects clamps and produces an integer between 6 and 40", () => {
    const v = calc_meld_3_0({ bilirubin_mg_dl: 0.5, creatinine_mg_dl: 0.7, inr: 1.2, sodium_mmol_l: 120, albumin_g_dl: 4.2, female: true, dialysis: false });
    expect(Number.isInteger(v)).toBe(true);
    expect(v).toBeGreaterThanOrEqual(6);
    expect(v).toBeLessThanOrEqual(40);
  });
});
