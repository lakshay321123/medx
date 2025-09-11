import { calc_geneva_simplified } from "../lib/medical/engine/calculators/revised_geneva_pe";

describe("calc_geneva_simplified", () => {
  it("scores example", () => {
    const v = calc_geneva_simplified({
      age_years: 70,
      previous_dvt_pe: true,
      surgery_fracture_recent: false,
      active_malignancy: false,
      unilateral_leg_pain: true,
      hemoptysis: false,
      heart_rate_bpm: 100,
      pain_on_deep_palpation_unilateral_edema: true
    });
    expect(v).toBe(6);
  });
});
