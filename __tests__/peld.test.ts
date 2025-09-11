import { calc_peld } from "../lib/medical/engine/calculators/peld";

describe("calc_peld", () => {
  it("handles age and growth terms", () => {
    const v = calc_peld({ bilirubin_mg_dl: 10, inr: 2, albumin_g_dl: 3, age_lt_1yr: true, growth_failure: true });
    expect(typeof v).toBe("number");
  });
});
