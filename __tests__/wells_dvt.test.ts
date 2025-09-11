import { calc_wells_dvt } from "../lib/medical/engine/calculators/wells_dvt";

describe("calc_wells_dvt", () => {
  it("applies -2 for alternative diagnosis", () => {
    const v = calc_wells_dvt({
      active_cancer: true, paralysis_immobilization: true, bedridden_3d_or_surgery_12w: false,
      localized_tenderness: true, entire_leg_swollen: false, calf_swelling_ge_3cm: true,
      pitting_edema_symptomatic_leg: false, collateral_superficial_veins: false,
      previous_dvt: true, alternative_dx_as_likely: true
    });
    expect(v).toBe(1+1+0+1+0+1+0+0+1-2);
  });
});
