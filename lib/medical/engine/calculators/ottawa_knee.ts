export type OttawaKneeInputs = {
  age_years:number;
  isolated_patellar_tenderness:boolean;
  fibular_head_tenderness:boolean;
  cannot_flex_90:boolean;
  unable_to_bear_weight_4_steps:boolean;
};

export function calc_ottawa_knee(i: OttawaKneeInputs): { xray_indicated:boolean; criteria:string[] } {
  const criteria:string[] = [];
  if (i.age_years >= 55) criteria.push("Age ≥55");
  if (i.isolated_patellar_tenderness) criteria.push("Isolated patellar tenderness");
  if (i.fibular_head_tenderness) criteria.push("Fibular head tenderness");
  if (i.cannot_flex_90) criteria.push("Cannot flex to 90°");
  if (i.unable_to_bear_weight_4_steps) criteria.push("Unable to bear weight (4 steps)");
  return { xray_indicated: criteria.length > 0, criteria };
}

const def = {
  id: "ottawa_knee",
  label: "Ottawa Knee Rule",
  inputs: [
    { id: "age_years", label: "Age (years)", type: "number", min: 0, max: 120 },
    { id: "isolated_patellar_tenderness", label: "Isolated patellar tenderness", type: "boolean" },
    { id: "fibular_head_tenderness", label: "Fibular head tenderness", type: "boolean" },
    { id: "cannot_flex_90", label: "Cannot flex to 90°", type: "boolean" },
    { id: "unable_to_bear_weight_4_steps", label: "Unable to bear weight (4 steps)", type: "boolean" }
  ],
  run: (args: OttawaKneeInputs) => {
    const r = calc_ottawa_knee(args);
    const notes = [r.xray_indicated ? "X-ray indicated" : "X-ray not indicated", ...r.criteria];
    return { id: "ottawa_knee", label: "Ottawa Knee", value: r.xray_indicated ? 1 : 0, unit: "flag", precision: 0, notes, extra: r };
  },
};
export default def;
