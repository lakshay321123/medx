import { calc_wells_pe } from "../lib/medical/engine/calculators/wells_pe";

describe("calc_wells_pe", () => {
  it("flags likely when >4", () => {
    const r = calc_wells_pe({ clinical_signs_dvt: true, pe_more_likely_than_alt: true, hr_gt_100: false, immobilization_or_surgery_4w: false, previous_dvt_pe: false, hemoptysis: false, malignancy: false });
    expect(r.score).toBe(6);
    expect(r.risk).toBe("likely");
  });
});
