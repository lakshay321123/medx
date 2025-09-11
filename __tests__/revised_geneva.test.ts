import { calc_revised_geneva } from "../lib/medical/engine/calculators/revised_geneva";

describe("calc_revised_geneva", () => {
  it("assigns high risk for >=11", () => {
    const r = calc_revised_geneva({ age_gt_65: true, previous_dvt_pe: true, surgery_or_fracture_last_month: true, active_malignancy: false, unilateral_lower_limb_pain: true, hemoptysis: true, hr_bpm: 110, pain_on_palpaption_edema: true });
    expect(r.score).toBeGreaterThanOrEqual(11);
    expect(r.risk).toBe("high");
  });
});
