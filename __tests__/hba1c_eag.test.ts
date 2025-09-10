  import { calc_eag_from_hba1c } from "../lib/medical/engine/calculators/hba1c_eag";

  describe("calc_eag_from_hba1c", () => {

it("converts HbA1c to eAG", () => {
  const r = calc_eag_from_hba1c({ hba1c_percent: 7.0 });
  expect(Math.round(r.mgdl)).toBe(154);
});

  });
