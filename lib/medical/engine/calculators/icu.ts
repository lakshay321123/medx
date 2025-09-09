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

register({
  id: "qsofa_partial",
  label: "qSOFA (partial)",
  inputs: [
    { key: "RRr" },
    { key: "SBP" },
  ],
  run: ({ RRr, SBP }) => {
    let score = 0;
    if (RRr != null && RRr >= 22) score += 1;
    if (SBP != null && SBP <= 100) score += 1;
    return {
      id: "qsofa_partial",
      label: "qSOFA (partial)",
      value: score,
      precision: 0,
      notes: ["Mentation not auto-scored in Phase-1"],
    };
  },
});
