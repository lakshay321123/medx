import { register } from "../registry";

// --- Canonical AG (no K) ---
register({
  id: "anion_gap",
  label: "Anion gap",
  tags: ["electrolytes", "acid-base"],
  inputs: [
    { key: "Na", required: true },
    { key: "Cl", required: true },
    { key: "HCO3", required: true },
  ],
  run: ({ Na, Cl, HCO3 }) => {
    if (Na == null || Cl == null || HCO3 == null) return null;
    const ag = Na - (Cl + HCO3); // no K
    const notes: string[] = [];
    if (ag > 12) notes.push("elevated anion gap");
    return { id: "anion_gap", label: "Anion gap", value: ag, unit: "mmol/L", precision: 1, notes };
  },
});

// --- Optional AG including K (distinct id) ---
register({
  id: "anion_gap_with_k",
  label: "Anion gap (+K⁺)",
  tags: ["electrolytes", "acid-base"],
  inputs: [
    { key: "Na", required: true },
    { key: "Cl", required: true },
    { key: "HCO3", required: true },
    { key: "K" },
  ],
  run: ({ Na, Cl, HCO3, K }) => {
    if (Na == null || Cl == null || HCO3 == null) return null;
    const agk = Na + (K ?? 0) - (Cl + HCO3);
    const notes: string[] = [];
    if (agk > 16) notes.push("elevated anion gap (+K)");
    return { id: "anion_gap_with_k", label: "Anion gap (+K⁺)", value: +agk.toFixed(1), unit: "mmol/L", precision: 1, notes };
  },
});

// --- Albumin-corrected AG (based on AG without K) ---
register({
  id: "anion_gap_corrected",
  label: "Anion gap (albumin-corrected)",
  tags: ["electrolytes", "acid-base"],
  inputs: [
    { key: "Na", required: true },
    { key: "Cl", required: true },
    { key: "HCO3", required: true },
    { key: "albumin", required: true }, // g/dL
  ],
  run: ({ Na, Cl, HCO3, albumin }) => {
    if (Na == null || Cl == null || HCO3 == null || albumin == null) return null;
    const ag = Na - (Cl + HCO3);
    const corrected = ag + 2.5 * (4 - albumin);
    const notes = [`AG=${ag.toFixed(1)}`, `corrected for albumin`];
    return { id: "anion_gap_corrected", label: "Anion gap (albumin-corrected)", value: corrected, unit: "mmol/L", precision: 1, notes };
  },
});

register({
  id: "corrected_na_hyperglycemia",
  label: "Corrected Na (hyperglycemia, 1.6)",
  inputs: [
    { key: "Na", required: true },
    { key: "glucose_mgdl" },
    { key: "glucose_mmol" },
  ],
  run: ({ Na, glucose_mgdl, glucose_mmol }) => {
    const glu = glucose_mgdl ?? (glucose_mmol != null ? glucose_mmol * 18 : undefined);
    if (Na == null || glu == null) return null;
    const val = Na + 1.6 * ((glu - 100) / 100);
    return {
      id: "corrected_na_hyperglycemia",
      label: "Corrected Na (1.6)",
      value: val,
      unit: "mmol/L",
      precision: 1,
    };
  },
});
