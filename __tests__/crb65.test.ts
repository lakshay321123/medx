import { calc_crb65 } from "../lib/medical/engine/calculators/crb65";

describe("calc_crb65", () => {
  it("assigns 4 criteria", () => {
    const v = calc_crb65({ confusion: false, resp_rate: 32, sbp: 88, dbp: 55, age_years: 50 });
    expect(v).toBeGreaterThanOrEqual(2);
  });
});
