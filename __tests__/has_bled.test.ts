  import { calc_has_bled } from "../lib/medical/engine/calculators/has_bled";

  describe("calc_has_bled", () => {

it("scores HAS-BLED", () => {
  const v = calc_has_bled({ htn: true, renal: true, liver: false, stroke: false, bleeding: true, labil_inr: false, age_gt_65: true, drugs_alcohol: true });
  expect(v).toBe(5);
});

  });
