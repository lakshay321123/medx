// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.


export type CHADS2Inputs = {
  chf: boolean;
  htn: boolean;
  age_ge_75: boolean;
  diabetes: boolean;
  stroke_tia: boolean;
};

export function calc_chads2(i: CHADS2Inputs): number {
  let s = 0;
  if (i.chf) s += 1;
  if (i.htn) s += 1;
  if (i.age_ge_75) s += 1;
  if (i.diabetes) s += 1;
  if (i.stroke_tia) s += 2;
  return s;
}

const def = {
  id: "chads2",
  label: "CHADS2 (AF stroke risk)",
  inputs: [
    { id: "chf", label: "CHF/LV dysfunction", type: "boolean" },
    { id: "htn", label: "Hypertension", type: "boolean" },
    { id: "age_ge_75", label: "Age ≥75", type: "boolean" },
    { id: "diabetes", label: "Diabetes", type: "boolean" },
    { id: "stroke_tia", label: "Prior Stroke/TIA", type: "boolean" }
  ],
  run: (args: CHADS2Inputs) => {
    const v = calc_chads2(args);
    return { id: "chads2", label: "CHADS2", value: v, unit: "score", precision: 0, notes: [] };
  },
};

export default def;
