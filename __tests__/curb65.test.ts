  import { calc_curb65 } from "../lib/medical/engine/calculators/curb65";

  describe("calc_curb65", () => {

it("scores CURB-65", () => {
  const v = calc_curb65({ confusion: true, urea_mmol_l: 8, resp_rate: 32, sbp: 85, dbp: 55, age_years: 70 });
  expect(v).toBe(5);
});

  });
