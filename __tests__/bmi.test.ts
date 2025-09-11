import { calc_bmi } from "../lib/medical/engine/calculators/bmi";

describe("calc_bmi", () => {
  it("computes BMI correctly", () => {
    const v = calc_bmi({ height_cm: 180, weight_kg: 81 });
    expect(v).toBeCloseTo(81 / (1.8*1.8), 4);
  });
});
