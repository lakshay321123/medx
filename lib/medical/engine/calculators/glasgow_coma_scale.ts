export type GCSInputs = { eye:number; verbal:number; motor:number };

export function calc_gcs(i: GCSInputs): { total:number; category:"severe"|"moderate"|"mild" } {
  const total = i.eye + i.verbal + i.motor;
  let category:"severe"|"moderate"|"mild" = "mild";
  if (total <= 8) category = "severe";
  else if (total <= 12) category = "moderate";
  return { total, category };
}

const def = {
  id: "glasgow_coma_scale",
  label: "Glasgow Coma Scale (GCS)",
  inputs: [
    { id: "eye", label: "Eye (1–4)", type: "number", min: 1, max: 4 },
    { id: "verbal", label: "Verbal (1–5)", type: "number", min: 1, max: 5 },
    { id: "motor", label: "Motor (1–6)", type: "number", min: 1, max: 6 }
  ],
  run: (args: GCSInputs) => {
    const r = calc_gcs(args);
    const notes = [r.category];
    return { id: "glasgow_coma_scale", label: "GCS", value: r.total, unit: "score", precision: 0, notes, extra: r };
  },
};

export default def;
