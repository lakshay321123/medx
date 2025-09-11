import { calc_ottawa_foot } from "../lib/medical/engine/calculators/ottawa_foot";
describe("calc_ottawa_foot", () => {
  it("needs midfoot pain + any criterion", () => {
    const r = calc_ottawa_foot({ midfoot_pain: true, tenderness_navicular: false, tenderness_base_5th: true, unable_to_bear_weight_4_steps: false });
    expect(r.xray_indicated).toBe(true);
  });
});
