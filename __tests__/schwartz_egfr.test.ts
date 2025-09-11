import { calc_schwartz_egfr } from "../lib/medical/engine/calculators/schwartz_egfr";

describe("calc_schwartz_egfr", () => {
  it("computes bedside Schwartz", () => {
    const v = calc_schwartz_egfr({ height_cm: 120, creatinine_mg_dl: 0.6 });
    expect(v).toBeCloseTo(0.413*120/0.6, 4);
  });
});
