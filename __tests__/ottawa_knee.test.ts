import { calc_ottawa_knee } from "../lib/medical/engine/calculators/ottawa_knee";
describe("calc_ottawa_knee", () => {
  it("indicates xray if any criterion present", () => {
    const r = calc_ottawa_knee({ age_years: 30, isolated_patellar_tenderness: false, fibular_head_tenderness: true, cannot_flex_90: false, unable_to_bear_weight_4_steps: false });
    expect(r.xray_indicated).toBe(true);
    expect(r.criteria.length).toBe(1);
  });
});
