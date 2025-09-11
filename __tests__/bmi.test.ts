import { calc_bmi } from "../lib/medical/engine/calculators/bmi";

describe("calc_bmi", () => {
  it("classifies category", () => {
    const r = calc_bmi({ height_cm: 170, weight_kg: 80 });
    expect(r.bmi).toBeCloseTo(80/((1.7)*(1.7)), 6);
    expect(r.category).toBe("overweight");
  });
});
