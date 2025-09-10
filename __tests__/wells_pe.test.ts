  import { calc_wells_pe } from "../lib/medical/engine/calculators/wells_pe";

  describe("calc_wells_pe", () => {

it("scores Wells PE", () => {
  const v = calc_wells_pe({
    dvt_signs: true, pe_most_likely: true, heart_rate: 110,
    recent_surgery_or_immobilization: false, prior_dvt_pe: false,
    hemoptysis: true, malignancy: false
  });
  expect(v).toBeCloseTo(8.5, 1);
});

  });
