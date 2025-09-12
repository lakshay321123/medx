import { register } from "../registry";

// CURB-65 for pneumonia severity. Requires complete inputs; otherwise do not emit.
// Confusion: boolean (new disorientation / AMT <= 8)
// BUN in mg/dL (>=20 → Urea ≥7 mmol/L)
register({
  id: "curb_65",
  label: "CURB-65",
  tags: ["pneumonia", "risk"],
  inputs: [
    { key: "confusion", required: true }, // boolean-ish
    { key: "BUN", required: true },       // mg/dL
    { key: "RR", required: true },
    { key: "SBP", required: true },
    { key: "DBP", required: true },
    { key: "age", required: true },
  ],
  run: ({ confusion, BUN, RR, SBP, DBP, age }) => {
    const toBool = (v: any) =>
      v === true ||
      (typeof v === "number" && v > 0) ||
      (typeof v === "string" && /^(yes|true|y)$/i.test(v));

    const c = toBool(confusion) ? 1 : 0;
    const u = Number(BUN) >= 20 ? 1 : 0;              // ~7 mmol/L urea
    const r = Number(RR) >= 30 ? 1 : 0;
    const b = (Number(SBP) < 90 || Number(DBP) <= 60) ? 1 : 0;
    const a = Number(age) >= 65 ? 1 : 0;

    const value = c + u + r + b + a;

    const notes: string[] = [];
    const band =
      value >= 3 ? "high" :
      value === 2 ? "intermediate" : "low";
    notes.push(`risk: ${band}`);
    if (value >= 3) notes.push("consider admission; evaluate for ICU/escalation");
    else if (value === 2) notes.push("consider short-stay/admission depending on context");
    else notes.push("outpatient management may be reasonable if stable");

    return { id: "curb_65", label: "CURB-65", value, precision: 0, notes };
  },
});
