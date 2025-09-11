import { calc_has_bled } from "../lib/medical/engine/calculators/has_bled";

describe("calc_has_bled", () => {
  it("sums risk indicators", () => {
    const v = calc_has_bled({ htn: true, abnormal_renal: true, abnormal_liver: false, stroke: false, bleeding: true, labile_inr: false, elderly_over_65: true, drugs_nsaids_antiplatelets: false, alcohol_excess: true });
    expect(v).toBe(5);
  });
});
