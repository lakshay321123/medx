import { calc_chads2 } from "../lib/medical/engine/calculators/chads2";

describe("calc_chads2", () => {
  it("gives 6 with all present including stroke history", () => {
    const v = calc_chads2({ chf: true, htn: true, age_ge_75: true, diabetes: true, stroke_tia: true });
    expect(v).toBe(6);
  });
});
