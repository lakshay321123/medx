import { calc_timi_stemi } from "../lib/medical/engine/calculators/timi_stemi";

describe("calc_timi_stemi", () => {
  it("weights age and hemodynamics", () => {
    const v = calc_timi_stemi({ age_years: 80, dm_htn_or_angina: true, sbp_mm_hg: 90, hr_bpm: 110, killip_class: "III", weight_kg: 60, anterior_stemi_or_lbbb: true, time_to_treatment_hours: 5 });
    expect(v).toBe(14);
  });
});
