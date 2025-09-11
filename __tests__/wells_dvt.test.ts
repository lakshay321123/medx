import { calc_wells_dvt } from "../lib/medical/engine/calculators/wells_dvt";

describe("calc_wells_dvt", () => {
  it("applies -2 when alternative dx more likely", () => {
    const r = calc_wells_dvt({
      active_cancer: true, paralysis_or_recent_immobilization: false, bedridden_recent_surgery: false,
      localized_tenderness: true, entire_leg_swollen: false, calf_swelling_ge_3cm: false, pitting_edema: false,
      collateral_superficial_veins: false, previous_dvt: false, alternative_diagnosis_more_likely: true
    });
    expect(r.score).toBe(0); // 1 + 1 - 2
    expect(r.risk).toBe("low");
  });
});
