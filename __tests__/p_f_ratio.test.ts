import { calc_p_f_ratio } from "../lib/medical/engine/calculators/p_f_ratio";

describe("calc_p_f_ratio", () => {
  it("computes ratio and category", () => {
    const r = calc_p_f_ratio({ pao2_mm_hg: 80, fio2_percent: 40 });
    expect(r.ratio).toBeCloseTo(80/0.4, 6);
    expect(r.category).toBe("mild");
  });
});
