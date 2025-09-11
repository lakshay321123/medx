import { calc_ottawa_ankle } from "../lib/medical/engine/calculators/ottawa_ankle";

describe("calc_ottawa_ankle", () => {
  it("recommends imaging when pain + any criterion", () => {
    const r = calc_ottawa_ankle({ pain_in_malleolar_zone: true, bone_tenderness_posterior_edge_or_tip_lateral_malleolus: false, bone_tenderness_posterior_edge_or_tip_medial_malleolus: false, inability_to_bear_weight_4_steps: true });
    expect(r.imaging_recommended).toBe(true);
    expect(r.criteria_met).toBe(1);
  });
});
