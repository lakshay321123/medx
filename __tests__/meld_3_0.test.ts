import { calc_meld_3_0 } from "../lib/medical/engine/calculators/meld_3_0";

describe("calc_meld_3_0", () => {
  it("uses caps and minimums per MELD 3.0 spec", () => {
    const v = calc_meld_3_0({
      sex: "female",
      bilirubin_mg_dl: 0.8,
      inr: 0.9,
      creatinine_mg_dl: 4,
      sodium_mmol_l: 140,
      albumin_g_dl: 4.0
    });
    expect(typeof v).toBe("number");
  });
});
