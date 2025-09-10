  import { calc_feurea } from "../../lib/medical/engine/calculators/fe_urea";

  describe("calc_feurea", () => {

it("computes FEUrea", () => {
  const v = calc_feurea({ urine_urea: 300, serum_urea: 30, urine_cr: 50, serum_cr: 2 });
  // (300*2)/(30*50)*100 = 40%
  expect(Math.round(v!)).toBe(40);
});

  });
