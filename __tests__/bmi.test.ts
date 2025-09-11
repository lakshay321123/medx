import { calc_bmi } from "../lib/medical/engine/calculators/bmi";

describe("calc_bmi", () => {
  it("computes kg/m² and classifies", () => {
    const r = calc_bmi({ height_cm: 180, weight_kg: 81 });
    expect(r.bmi).toBeCloseTo(81/3.24, 6);
    expect(["normal","overweight","obesity","underweight"]).toContain(r.category);
  });
});
