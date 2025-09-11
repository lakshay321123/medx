import { calc_wells_pe } from "../lib/medical/engine/calculators/wells_pe";

describe("calc_wells_pe", () => {
  it("scores risk bands", () => {
    const r = calc_wells_pe({ clinical_signs_dvt: true, pe_most_likely: true, hr_gt_100: false, immobilization_or_surgery: false, previous_dvt_pe: false, hemoptysis: false, malignancy: false });
    expect(r.score).toBe(6);
    expect(r.risk).toBe("moderate");
  });
});
