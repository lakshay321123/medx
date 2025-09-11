import { calc_egfr_mdrd } from "../lib/medical/engine/calculators/egfr_mdrd";

describe("calc_egfr_mdrd", () => {
  it("applies sex and race multipliers", () => {
    const base = calc_egfr_mdrd({ scr_mg_dl: 1, age_years: 60, sex: "male", black: false });
    const female = calc_egfr_mdrd({ scr_mg_dl: 1, age_years: 60, sex: "female", black: false });
    const black = calc_egfr_mdrd({ scr_mg_dl: 1, age_years: 60, sex: "male", black: true });
    expect(female).toBeCloseTo(base * 0.742, 6);
    expect(black).toBeCloseTo(base * 1.212, 6);
  });
});
