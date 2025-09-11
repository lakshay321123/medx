// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

export type ApgarInputs = {
  appearance: 0|1|2;
  pulse: 0|1|2;
  grimace: 0|1|2;
  activity: 0|1|2;
  respiration: 0|1|2;
};

export function calc_apgar(i: ApgarInputs): number {
  return i.appearance + i.pulse + i.grimace + i.activity + i.respiration;
}

const def = {
  id: "apgar",
  label: "APGAR (newborn)",
  inputs: [
    { id: "appearance", label: "Appearance (color)", type: "number", min: 0, max: 2, step: 1 },
    { id: "pulse", label: "Pulse", type: "number", min: 0, max: 2, step: 1 },
    { id: "grimace", label: "Grimace (reflex)", type: "number", min: 0, max: 2, step: 1 },
    { id: "activity", label: "Activity (tone)", type: "number", min: 0, max: 2, step: 1 },
    { id: "respiration", label: "Respiration", type: "number", min: 0, max: 2, step: 1 }
  ],
  run: (args: ApgarInputs) => {
    const v = calc_apgar(args);
    return { id: "apgar", label: "APGAR", value: v, unit: "score", precision: 0, notes: [] };
  },
};

export default def;
