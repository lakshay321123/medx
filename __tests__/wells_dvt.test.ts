import { calc_wells_dvt } from "../lib/medical/engine/calculators/wells_dvt";

describe("calc_wells_dvt", () => {
  it("applies -2 for alternative diagnosis", () => {
    const r = calc_wells_dvt({ active_cancer: true, paralysis_paresis_or_cast: false, recently_bedridden_or_surgery: false, localized_tenderness_dvt: false, entire_leg_swollen: false, calf_swelling_gt_3cm: false, pitting_edema_symptomatic_leg: false, collateral_superficial_veins: false, previous_dvt: false, alternative_diagnosis_as_likely: true });
    expect(r.score).toBe(-1);
    expect(r.risk).toBe("low");
  });
});
