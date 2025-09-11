export type OttawaAnkleInputs = {
  pain_in_malleolar_zone: boolean;
  bone_tenderness_posterior_edge_or_tip_lateral_malleolus: boolean;
  bone_tenderness_posterior_edge_or_tip_medial_malleolus: boolean;
  inability_to_bear_weight_4_steps: boolean;
};

export function calc_ottawa_ankle(i: OttawaAnkleInputs): { criteria_met: number; imaging_recommended: boolean } {
  const c1 = i.pain_in_malleolar_zone &&
    (i.bone_tenderness_posterior_edge_or_tip_lateral_malleolus ||
     i.bone_tenderness_posterior_edge_or_tip_medial_malleolus ||
     i.inability_to_bear_weight_4_steps);
  const criteria = [
    i.bone_tenderness_posterior_edge_or_tip_lateral_malleolus,
    i.bone_tenderness_posterior_edge_or_tip_medial_malleolus,
    i.inability_to_bear_weight_4_steps
  ].filter(Boolean).length;
  return { criteria_met: criteria, imaging_recommended: !!c1 };
}

const def = {
  id: "ottawa_ankle",
  label: "Ottawa Ankle Rules",
  inputs: [
    { id: "pain_in_malleolar_zone", label: "Pain in malleolar zone", type: "boolean" },
    { id: "bone_tenderness_posterior_edge_or_tip_lateral_malleolus", label: "Bone tenderness at posterior edge/tip lateral malleolus", type: "boolean" },
    { id: "bone_tenderness_posterior_edge_or_tip_medial_malleolus", label: "Bone tenderness at posterior edge/tip medial malleolus", type: "boolean" },
    { id: "inability_to_bear_weight_4_steps", label: "Inability to bear weight (4 steps)", type: "boolean" }
  ],
  run: (args: OttawaAnkleInputs) => {
    const r = calc_ottawa_ankle(args);
    const notes = [r.imaging_recommended ? "X-ray indicated" : "No X-ray per rules"];
    return { id: "ottawa_ankle", label: "Ottawa Ankle", value: r.criteria_met, unit: "criteria", precision: 0, notes, extra: r };
  },
};

export default def;
