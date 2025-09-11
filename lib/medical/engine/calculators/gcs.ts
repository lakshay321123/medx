export type GCSInputs = {
  eye: 1|2|3|4;
  verbal: 1|2|3|4|5;
  motor: 1|2|3|4|5|6;
};

export function calc_gcs(i: GCSInputs): { score: number; category: "severe"|"moderate"|"mild" } {
  const s = i.eye + i.verbal + i.motor;
  let cat: "severe"|"moderate"|"mild" = "severe";
  if (s >= 13) cat = "mild";
  else if (s >= 9) cat = "moderate";
  else cat = "severe";
  return { score: s, category: cat };
}

const def = {
  id: "gcs",
  label: "Glasgow Coma Scale (GCS)",
  inputs: [
    { id: "eye", label: "Eye response (1–4)", type: "number", min: 1, max: 4 },
    { id: "verbal", label: "Verbal response (1–5)", type: "number", min: 1, max: 5 },
    { id: "motor", label: "Motor response (1–6)", type: "number", min: 1, max: 6 }
  ],
  run: (args: GCSInputs) => {
    const r = calc_gcs(args);
    const notes = [r.category];
    return { id: "gcs", label: "GCS", value: r.score, unit: "score", precision: 0, notes, extra: r };
  },
};

export default def;
