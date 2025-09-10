  import { calc_meld_na } from "../lib/medical/engine/calculators/meld_na";

  describe("calc_meld_na", () => {

it("computes MELD-Na", () => {
  const r = calc_meld_na({ creatinine_mg_dl: 1.0, bilirubin_mg_dl: 3.0, inr: 2.0, sodium_mmol_l: 130 });
  expect(r.meldNa).toBe(23);
});

  });
