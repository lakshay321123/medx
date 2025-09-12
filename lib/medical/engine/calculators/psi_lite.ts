import { register } from "../registry";

// PSI-lite (very simple vitals-based screen, not a substitute for full PSI).
// Purpose here: avoid spurious output — only emit if ALL required vitals exist.
// Thresholds roughly mirror concerning vitals for CAP triage.
register({
  id: "psi_lite",
  label: "PSI-lite",
  tags: ["pneumonia", "risk"],
  inputs: [
    { key: "age", required: true },
    { key: "RR", required: true },
    { key: "SBP", required: true },
    { key: "temp_c", required: true },
    { key: "spo2_percent", required: true },
  ],
  run: ({ age, RR, SBP, temp_c, spo2_percent }) => {
    const points =
      (Number(age) >= 65 ? 1 : 0) +
      (Number(RR) >= 30 ? 1 : 0) +
      (Number(SBP) < 90 ? 1 : 0) +
      ((Number(temp_c) < 35 || Number(temp_c) >= 40) ? 1 : 0) +
      (Number(spo2_percent) <= 92 ? 1 : 0);

    const notes: string[] = [];
    const band =
      points >= 3 ? "higher" :
      points === 2 ? "intermediate" : "lower";
    notes.push(`risk: ${band}`);
    notes.push("screen only; use full PSI/clinical judgment");

    return { id: "psi_lite", label: "PSI-lite", value: points, precision: 0, notes };
  },
});
