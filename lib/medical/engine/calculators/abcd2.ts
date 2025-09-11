// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

export type ABCD2Inputs = {
  age_ge_60: boolean;
  bp_ge_140_90: boolean;
  clinical: "weakness" | "speech" | "other";
  duration_min: number;
  diabetes: boolean;
};

export function calc_abcd2(i: ABCD2Inputs): number {
  let s = 0;
  if (i.age_ge_60) s += 1;
  if (i.bp_ge_140_90) s += 1;
  if (i.clinical === "weakness") s += 2;
  else if (i.clinical === "speech") s += 1;
  if (i.duration_min >= 60) s += 2;
  else if (i.duration_min >= 10) s += 1;
  if (i.diabetes) s += 1;
  return s;
}

const def = {
  id: "abcd2",
  label: "ABCD2 (TIA risk)",
  inputs: [
    { id: "age_ge_60", label: "Age ≥60", type: "boolean" },
    { id: "bp_ge_140_90", label: "BP ≥140/90", type: "boolean" },
    { id: "clinical", label: "Clinical feature", type: "select", options: [
      {label:"Unilateral weakness", value:"weakness"},
      {label:"Speech disturbance without weakness", value:"speech"},
      {label:"Other", value:"other"}
    ]},
    { id: "duration_min", label: "Duration (min)", type: "number", min: 0 },
    { id: "diabetes", label: "Diabetes", type: "boolean" }
  ],
  run: (args: ABCD2Inputs) => {
    const v = calc_abcd2(args);
    return { id: "abcd2", label: "ABCD2", value: v, unit: "score", precision: 0, notes: [] };
  },
};

export default def;
