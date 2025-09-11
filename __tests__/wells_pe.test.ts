import { calc_wells_pe } from "../lib/medical/engine/calculators/wells_pe";

describe("calc_wells_pe", () => {
  it("classifies high when >6", () => {
    const r = calc_wells_pe({ clinical_signs_dvt: true, pe_more_likely_than_alt: true, hr_gt_100: true, immobilization_or_surgery_4w: true, prior_dvt_pe: false, hemoptysis: false, active_cancer: false });
    expect(r.score).toBeGreaterThan(6);
    expect(r.category).toBe("high");
  });
});
