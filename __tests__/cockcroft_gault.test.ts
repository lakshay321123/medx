import { calc_cockcroft_gault } from "../lib/medical/engine/calculators/cockcroft_gault";

describe("calc_cockcroft_gault", () => {
  it("matches male example", () => {
    const v = calc_cockcroft_gault({ age_years: 65, weight_kg: 80, sex: "male", creatinine_mg_dl: 1.2 });
    expect(v).toBeCloseTo(((140-65)*80)/(72*1.2), 4);
  });
  it("applies female factor", () => {
    const male = calc_cockcroft_gault({ age_years: 65, weight_kg: 80, sex: "male", creatinine_mg_dl: 1.2 });
    const female = calc_cockcroft_gault({ age_years: 65, weight_kg: 80, sex: "female", creatinine_mg_dl: 1.2 });
    expect(female).toBeCloseTo(male*0.85, 4);
  });
});
