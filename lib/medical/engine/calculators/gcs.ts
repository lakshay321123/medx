// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

export type GCSInputs = { eye: 1|2|3|4; verbal: 1|2|3|4|5; motor: 1|2|3|4|5|6 };

export function calc_gcs({ eye, verbal, motor }: GCSInputs): number {
  return eye + verbal + motor;
}

const def = {
  id: "gcs",
  label: "Glasgow Coma Scale (total)",
  inputs: [
    { id: "eye", label: "Eye (E1–E4)", type: "number", min: 1, max: 4, step: 1 },
    { id: "verbal", label: "Verbal (V1–V5)", type: "number", min: 1, max: 5, step: 1 },
    { id: "motor", label: "Motor (M1–M6)", type: "number", min: 1, max: 6, step: 1 }
  ],
  run: (args: GCSInputs) => {
    const v = calc_gcs(args);
    const notes = [v <= 8 ? "severe" : v <= 12 ? "moderate" : "mild"];
    return { id: "gcs", label: "Glasgow Coma Scale", value: v, unit: "points", precision: 0, notes };
  },
};

export default def;
