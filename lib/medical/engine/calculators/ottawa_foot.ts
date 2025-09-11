export type OttawaFootInputs = {
  midfoot_pain:boolean;
  tenderness_navicular:boolean;
  tenderness_base_5th:boolean;
  unable_to_bear_weight_4_steps:boolean;
};

export function calc_ottawa_foot(i: OttawaFootInputs): { xray_indicated:boolean; criteria:string[] } {
  const criteria:string[] = [];
  if (!i.midfoot_pain) return { xray_indicated: false, criteria };
  if (i.tenderness_navicular) criteria.push("Navicular tenderness");
  if (i.tenderness_base_5th) criteria.push("Base of 5th metatarsal tenderness");
  if (i.unable_to_bear_weight_4_steps) criteria.push("Unable to bear weight (4 steps)");
  return { xray_indicated: criteria.length > 0, criteria };
}

const def = {
  id: "ottawa_foot",
  label: "Ottawa Foot Rule",
  inputs: [
    { id: "midfoot_pain", label: "Midfoot pain", type: "boolean" },
    { id: "tenderness_navicular", label: "Navicular tenderness", type: "boolean" },
    { id: "tenderness_base_5th", label: "Base of 5th metatarsal tenderness", type: "boolean" },
    { id: "unable_to_bear_weight_4_steps", label: "Unable to bear weight (4 steps)", type: "boolean" }
  ],
  run: (args: OttawaFootInputs) => {
    const r = calc_ottawa_foot(args);
    const notes = [r.xray_indicated ? "X-ray indicated" : "X-ray not indicated", ...r.criteria];
    return { id: "ottawa_foot", label: "Ottawa Foot", value: r.xray_indicated ? 1 : 0, unit: "flag", precision: 0, notes, extra: r };
  },
};
export default def;
