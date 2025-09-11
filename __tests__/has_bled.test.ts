import { calc_has_bled } from "../lib/medical/engine/calculators/has_bled";

describe("calc_has_bled", () => {
  it("sums risk factors", () => {
    const v = calc_has_bled({ hypertension: true, abnormal_renal: true, abnormal_liver: true, stroke: false, bleeding: true, labile_inr: false, elderly_age_ge_65: true, drugs: false, alcohol: true });
    expect(v).toBe(6);
  });
});
