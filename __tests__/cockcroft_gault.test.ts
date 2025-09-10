  import { calc_cockcroft_gault } from "../lib/medical/engine/calculators/cockcroft_gault";

  describe("calc_cockcroft_gault", () => {

it("computes CrCl (male)", () => {
  const v = calc_cockcroft_gault({ age_years: 60, weight_kg: 70, sex: "male", serum_creatinine_mg_dl: 1.0 });
  expect(v).toBeCloseTo(77.8, 1);
});

  });
