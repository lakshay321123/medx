  import { calc_mifflin_st_jeor } from "../lib/medical/engine/calculators/mifflin_st_jeor";

  describe("calc_mifflin_st_jeor", () => {

it("computes REE for male", () => {
  const v = calc_mifflin_st_jeor({ weight_kg: 70, height_cm: 175, age_years: 30, sex: "male" });
  expect(Math.round(v!)).toBe(1649);
});
it("computes REE for female", () => {
  const v = calc_mifflin_st_jeor({ weight_kg: 60, height_cm: 165, age_years: 30, sex: "female" });
  expect(Math.round(v!)).toBe(1320);
});

  });
