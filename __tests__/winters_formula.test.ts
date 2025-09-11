import { calc_winters } from "../lib/medical/engine/calculators/winters_formula";

describe("calc_winters", () => {
  it("computes 1.5*HCO3 + 8 ±2", () => {
    const r = calc_winters({ hco3_mmol_l: 20 });
    expect(r.expected_paco2_mm_hg).toBeCloseTo(1.5*20+8, 6);
    expect(r.low).toBeCloseTo(1.5*20+8-2, 6);
    expect(r.high).toBeCloseTo(1.5*20+8+2, 6);
  });
});
