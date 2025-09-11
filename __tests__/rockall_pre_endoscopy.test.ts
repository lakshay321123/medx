import { calc_rockall_pre } from "../lib/medical/engine/calculators/rockall_pre_endoscopy";

describe("calc_rockall_pre", () => {
  it("handles age, shock, and comorbidity", () => {
    const v = calc_rockall_pre({ age_years: 85, pulse_bpm: 110, sbp_mm_hg: 95, comorbidity: "renal_liver_malignancy" });
    expect(v).toBe(2 + 2 + 3);
  });
});
