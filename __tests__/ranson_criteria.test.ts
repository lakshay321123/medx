import { calc_ranson } from "../lib/medical/engine/calculators/ranson_criteria";

describe("calc_ranson", () => {
  it("scores across admission and 48h criteria", () => {
    const v = calc_ranson({
      age_years: 60, wbc_10e9_l: 18, glucose_mg_dl: 220, ast_u_l: 300, ldh_u_l: 400,
      hct_drop_percent: 12, bun_increase_mg_dl: 6, calcium_mg_dl: 7.5, pao2_mm_hg: 55,
      base_deficit_mEq_l: 5, fluid_sequestration_l: 7
    });
    expect(v).toBe(11);
  });
});
