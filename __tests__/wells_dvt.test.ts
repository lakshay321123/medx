import { calc_wells_dvt } from "../lib/medical/engine/calculators/wells_dvt";

describe("calc_wells_dvt", () => {
  it("subtracts 2 for alternative diagnosis", () => {
    const r = calc_wells_dvt({
      active_cancer: true,
      paralysis_paresis_recent_cast: false,
      bedridden_3d_or_major_surgery_12w: false,
      localized_tenderness: false,
      entire_leg_swollen: false,
      calf_swelling_gt_3cm: false,
      pitting_edema_symptomatic_leg: false,
      collateral_superficial_veins: false,
      prior_dvt: false,
      alternative_dx_as_likely: true
    });
    expect(r.score).toBe(-1);
    expect(r.category).toBe("low");
  });
});
