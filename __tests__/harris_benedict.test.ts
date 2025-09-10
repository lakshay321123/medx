  import { calc_harris_benedict } from "../../lib/medical/engine/calculators/harris_benedict";

  describe("calc_harris_benedict", () => {

it("computes BMR male", () => {
  const v = calc_harris_benedict({ weight_kg: 70, height_cm: 175, age_years: 30, sex: "male" });
  expect(Math.round(v!)).toBe(1702);
});
it("computes BMR female", () => {
  const v = calc_harris_benedict({ weight_kg: 60, height_cm: 165, age_years: 30, sex: "female" });
  expect(Math.round(v!)).toBe(1402);
});

  });
