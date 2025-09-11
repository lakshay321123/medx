// Batch 14 calculator
export type NEXUSInputs = {
  no_midline_tenderness: boolean;
  no_intoxication: boolean;
  normal_alertness: boolean;
  no_focal_neurologic_deficit: boolean;
  no_painful_distracting_injury: boolean;
};

export function calc_nexus_cspine(i: NEXUSInputs): { all_low_risk: boolean } {
  const all_low = i.no_midline_tenderness && i.no_intoxication && i.normal_alertness && i.no_focal_neurologic_deficit && i.no_painful_distracting_injury;
  return { all_low_risk: all_low };
}

const def = {
  id: "nexus_cspine",
  label: "NEXUS C-spine (low-risk rule)",
  inputs: [
    { id: "no_midline_tenderness", label: "No midline c-spine tenderness", type: "boolean" },
    { id: "no_intoxication", label: "No intoxication", type: "boolean" },
    { id: "normal_alertness", label: "Normal alertness", type: "boolean" },
    { id: "no_focal_neurologic_deficit", label: "No focal neurologic deficit", type: "boolean" },
    { id: "no_painful_distracting_injury", label: "No painful distracting injury", type: "boolean" }
  ],
  run: (args: NEXUSInputs) => {
    const r = calc_nexus_cspine(args);
    const notes = [r.all_low_risk ? "All low-risk present → imaging often not required" : "Rule not satisfied"];
    return { id: "nexus_cspine", label: "NEXUS C-spine", value: r.all_low_risk ? 1 : 0, unit: "flag", precision: 0, notes, extra: r };
  },
};

export default def;
