// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_wells_dvt } from "../lib/medical/engine/calculators/wells_dvt";

describe("calc_wells_dvt", () => {
  it("calculates with negative points for alt diagnosis", () => {
    const v = calc_wells_dvt({
      active_cancer: true, paralysis_paresis_recent_cast: true, bedridden_3d_or_major_surgery_12w: false,
      localized_tenderness: true, entire_leg_swollen: false, calf_swelling_ge_3cm: true,
      pitting_edema_confined: true, collateral_superficial_veins: false, prior_dvt: false, alt_dx_as_likely: true
    });
    expect(v).toBe(1+1+0+1+0+1+1+0+0-2);
  });
});
