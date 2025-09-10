  import { calc_chads2vasc } from "../../lib/medical/engine/calculators/chads2vasc";

  describe("calc_chads2vasc", () => {

it("scores CHA2DS2-VASc", () => {
  const v = calc_chads2vasc({ age_years: 78, sex: "male", chf: true, htn: true, dm: false, stroke_tia: true, vascular: true });
  // CHF1 + HTN1 + Age>=75 (2) + Stroke/TIA (2) + Vasc (1) + Male(0) = 7
  expect(v).toBe(7);
});

  });
