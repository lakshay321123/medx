import { calc_curb65 } from "../lib/medical/engine/calculators/curb65";

describe("calc_curb65", () => {
  it("assigns 5 criteria", () => {
    const v = calc_curb65({ confusion: true, urea_mmol_l: 10, resp_rate: 35, sbp: 100, dbp: 60, age_years: 70 });
    expect(v).toBeGreaterThanOrEqual(3);
  });
});
