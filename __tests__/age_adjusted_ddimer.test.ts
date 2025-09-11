import { calc_age_adjusted_ddimer } from "../lib/medical/engine/calculators/age_adjusted_ddimer";

describe("calc_age_adjusted_ddimer", () => {
  it("uses 500 under or equal to 50", () => {
    expect(calc_age_adjusted_ddimer({ age_years: 50 })).toBe(500);
  });
  it("uses age*10 above 50", () => {
    expect(calc_age_adjusted_ddimer({ age_years: 72 })).toBe(720);
  });
});
