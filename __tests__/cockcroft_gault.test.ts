import { calc_cockcroft_gault } from "../lib/medical/engine/calculators/cockcroft_gault";

describe("calc_cockcroft_gault", () => {
  it("computes with sex factor 0.85 for females", () => {
    const male = calc_cockcroft_gault({ age_years: 60, weight_kg: 70, scr_mg_dl: 1.0, sex: "male" });
    const female = calc_cockcroft_gault({ age_years: 60, weight_kg: 70, scr_mg_dl: 1.0, sex: "female" });
    expect(female).toBeCloseTo(male * 0.85, 6);
  });
});
