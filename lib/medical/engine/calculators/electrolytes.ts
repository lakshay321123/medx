import { register } from "../registry";

// Anion gap (±K)
register({
  id: "anion_gap",
  label: "Anion gap",
  inputs: [
    { key: "Na", required: true },
    { key: "Cl", required: true },
    { key: "HCO3", required: true },
    { key: "K" },
  ],
  run: ({ Na, Cl, HCO3, K }) => {
    if (Na == null || Cl == null || HCO3 == null) return null;
    const ag = Na + (K ?? 0) - (Cl + HCO3);
    return { id: "anion_gap", label: "Anion gap", value: ag, unit: "mmol/L", precision: 1 };
  },
});

// Albumin-corrected AG: AG + 2.5*(4 - albumin)
register({
  id: "anion_gap_corrected",
  label: "Anion gap (albumin-corrected)",
  inputs: [
    { key: "Na", required: true },
    { key: "Cl", required: true },
    { key: "HCO3", required: true },
    { key: "albumin", required: true },
    { key: "K" },
  ],
  run: ({ Na, Cl, HCO3, albumin, K }) => {
    const ag = Na! + (K ?? 0) - (Cl! + HCO3!);
    const corrected = ag + 2.5 * (4 - albumin!);
    return { id: "anion_gap_corrected", label: "Anion gap (albumin-corrected)", value: corrected, unit: "mmol/L", precision: 1 };
  },
});

