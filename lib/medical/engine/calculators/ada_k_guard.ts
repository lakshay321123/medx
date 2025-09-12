import { register } from "../registry";

register({
  id: "ada_k_guard",
  label: "Potassium guard (DKA/HAGMA)",
  inputs: [{ key: "K", required: true }],
  run: ({ K }) => {
    if (K == null) return null;
    const notes: string[] = [];
    if (K >= 6.0) notes.push("ECG now; give IV calcium if changes");
    if (K < 3.3) notes.push("HOLD insulin; replace K⁺ until ≥3.3");
    else if (K <= 5.2) notes.push("replace K⁺ while giving insulin");
    else notes.push("no K⁺ replacement initially; insulin will lower K⁺");
    return { id: "ada_k_guard", label: "Potassium guard", value: +K.toFixed(1), unit: "mmol/L", precision: 1, notes };
  },
});
