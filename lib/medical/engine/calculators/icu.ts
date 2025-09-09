import { register } from "../registry";

register({
  id: "qsofa",
  label: "qSOFA",
  inputs: [
    { key: "RR", required: true },
    { key: "SBP", required: true },
    { key: "GCS", required: true },
  ],
  run: ({ RR, SBP, GCS }) => {
    if (RR == null || SBP == null || GCS == null) return null;
    let s = 0;
    if (RR >= 22) s++;
    if (SBP <= 100) s++;
    if (GCS < 15) s++;
    const notes = s >= 2 ? ["high risk"] : [];
    return { id: "qsofa", label: "qSOFA", value: s, notes };
  },
});
