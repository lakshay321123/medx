import { register } from "../registry";

/**
 * qSOFA: RR ≥22, SBP ≤100, altered mentation (GCS < 15)
 */
export function calc_qsofa({
  resp_rate, sbp, gcs
}: {
  resp_rate: number,
  sbp: number,
  gcs: number
}) {
  let s = 0;
  if (resp_rate >= 22) s += 1;
  if (sbp <= 100) s += 1;
  if (gcs < 15) s += 1;
  return s;
}

register({
  id: "qsofa",
  label: "qSOFA",
  tags: ["critical care", "infectious disease"],
  inputs: [
    { key: "resp_rate", required: true },
    { key: "sbp", required: true },
    { key: "gcs", required: true }
  ],
  run: ({ resp_rate, sbp, gcs }: { resp_rate: number; sbp: number; gcs: number; }) => {
    const v = calc_qsofa({ resp_rate, sbp, gcs });
    return { id: "qsofa", label: "qSOFA", value: v, unit: "score", precision: 0, notes: [] };
  },
});
