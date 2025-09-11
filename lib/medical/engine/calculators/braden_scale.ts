// Batch 14 calculator
export type BradenInputs = {
  sensory: 1|2|3|4;
  moisture: 1|2|3|4;
  activity: 1|2|3|4;
  mobility: 1|2|3|4;
  nutrition: 1|2|3|4;
  friction_shear: 1|2|3;
};

export function calc_braden(i: BradenInputs): { score: number; risk: "very_high"|"high"|"moderate"|"mild"|"none" } {
  const s = i.sensory + i.moisture + i.activity + i.mobility + i.nutrition + i.friction_shear;
  let risk: "very_high"|"high"|"moderate"|"mild"|"none" = "none";
  if (s <= 9) risk = "very_high";
  else if (s <= 12) risk = "high";
  else if (s <= 14) risk = "moderate";
  else if (s <= 18) risk = "mild";
  else risk = "none";
  return { score: s, risk };
}

const def = {
  id: "braden_scale",
  label: "Braden Scale (pressure injury risk)",
  inputs: [
    { id: "sensory", label: "Sensory perception (1–4)", type: "number", min: 1, max: 4, step: 1 },
    { id: "moisture", label: "Moisture (1–4)", type: "number", min: 1, max: 4, step: 1 },
    { id: "activity", label: "Activity (1–4)", type: "number", min: 1, max: 4, step: 1 },
    { id: "mobility", label: "Mobility (1–4)", type: "number", min: 1, max: 4, step: 1 },
    { id: "nutrition", label: "Nutrition (1–4)", type: "number", min: 1, max: 4, step: 1 },
    { id: "friction_shear", label: "Friction & shear (1–3)", type: "number", min: 1, max: 3, step: 1 }
  ],
  run: (args: BradenInputs) => {
    const r = calc_braden(args);
    const notes = [r.risk.replace("_"," ") + " risk"];
    return { id: "braden_scale", label: "Braden Scale", value: r.score, unit: "points", precision: 0, notes, extra: r };
  },
};

export default def;
