  import { calc_crb65 } from "../lib/medical/engine/calculators/crb65";

  describe("calc_crb65", () => {

it("scores CRB-65", () => {
  const v = calc_crb65({ confusion: false, resp_rate: 30, sbp: 88, dbp: 58, age_years: 67 });
  expect(v).toBe(3);
});

  });
