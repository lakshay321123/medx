import { calc_cockcroft_gault } from "../lib/medical/engine/calculators/cockcroft_gault";

describe("calc_cockcroft_gault", () => {
  it("reduces for females by 15%", () => {
    const male = calc_cockcroft_gault({ age_years: 60, weight_kg: 80, sex: "male", scr_mg_dl: 1 });
    const female = calc_cockcroft_gault({ age_years: 60, weight_kg: 80, sex: "female", scr_mg_dl: 1 });
    expect(female).toBeCloseTo(male * 0.85, 6);
  });
});
