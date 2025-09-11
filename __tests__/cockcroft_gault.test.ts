// Batch 14 test
import { calc_cockcroft_gault } from "../lib/medical/engine/calculators/cockcroft_gault";

describe("calc_cockcroft_gault", () => {
  it("applies 0.85 factor for females", () => {
    const male = calc_cockcroft_gault({ sex: "male", age_years: 60, weight_kg: 80, scr_mg_dl: 1.0 });
    const female = calc_cockcroft_gault({ sex: "female", age_years: 60, weight_kg: 80, scr_mg_dl: 1.0 });
    expect(female).toBeCloseTo(male * 0.85, 6);
  });
});
