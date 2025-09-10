  import { calc_bmi } from "../lib/medical/engine/calculators/bmi";

  describe("calc_bmi", () => {

it("computes BMI from kg and cm", () => {
  const v = calc_bmi({ weight_kg: 70, height_cm: 175 });
  expect(v).toBeCloseTo(22.857, 3);
});
it("returns null on missing inputs", () => {
  const v = calc_bmi({ weight_kg: 70 } as any);
  expect(v).toBeNull();
});

  });
