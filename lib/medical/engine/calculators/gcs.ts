// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.

export type GCSInputs = {
  eye: 1|2|3|4;
  verbal: 1|2|3|4|5;
  motor: 1|2|3|4|5|6;
};

export function calc_gcs({ eye, verbal, motor }: GCSInputs): number {
  return eye + verbal + motor;
}

const def = {
  id: "gcs",
  label: "Glasgow Coma Scale (GCS)",
  inputs: [
    { id: "eye", label: "Eye (1–4)", type: "number", min: 1, max: 4, step: 1 },
    { id: "verbal", label: "Verbal (1–5)", type: "number", min: 1, max: 5, step: 1 },
    { id: "motor", label: "Motor (1–6)", type: "number", min: 1, max: 6, step: 1 }
  ],
  run: (args: GCSInputs) => {
    const v = calc_gcs(args);
    return { id: "gcs", label: "GCS", value: v, unit: "score", precision: 0, notes: [] };
  },
};

export default def;
