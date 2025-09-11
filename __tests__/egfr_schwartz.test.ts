import { calc_egfr_schwartz } from "../lib/medical/engine/calculators/egfr_schwartz";
describe("calc_egfr_schwartz", () => {
  it("uses 0.413 * height / SCr", () => {
    const v = calc_egfr_schwartz({ height_cm: 140, creatinine_mg_dl: 1 });
    expect(v).toBeCloseTo(57.82, 2);
  });
});
