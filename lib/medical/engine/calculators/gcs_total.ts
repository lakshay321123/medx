import { register } from "../registry";

/** Glasgow Coma Scale total (3–15) */
export type GCSInputs = { eye: 1|2|3|4; verbal: 1|2|3|4|5; motor: 1|2|3|4|5|6 };

export function runGCS(i: GCSInputs) {
  if ([i.eye,i.verbal,i.motor].some(v => v == null)) return null;
  const total = i.eye + i.verbal + i.motor;
  const notes: string[] = [];
  if (total <= 8) notes.push("severe (≤8)");
  else if (total <= 12) notes.push("moderate (9–12)");
  else notes.push("mild (13–15)");
  return { total, notes };
}

register({
  id: "gcs_total",
  label: "Glasgow Coma Scale (total)",
  inputs: [
    { key: "eye", required: true },
    { key: "verbal", required: true },
    { key: "motor", required: true },
  ],
  run: (ctx: any) => {
    const r = runGCS(ctx as GCSInputs);
    if (!r) return null;
    return { id: "gcs_total", label: "GCS (total)", value: r.total, unit: "points", precision: 0, notes: r.notes };
  },
});
