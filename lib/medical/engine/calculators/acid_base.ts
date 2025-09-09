import { register } from "../registry";

register({
  id: "anion_gap_albumin_corrected",
  label: "Anion gap (albumin-corrected)",
  inputs: [
    { key: "Na", required: true },
    { key: "Cl", required: true },
    { key: "HCO3", required: true },
    { key: "albumin", required: true },
    { key: "K" },
  ],
  run: ({ Na, Cl, HCO3, albumin, K }) => {
    if (Na == null || Cl == null || HCO3 == null || albumin == null) return null;
    const ag = Na + (K ?? 0) - (Cl + HCO3);
    const val = ag + 2.5 * (4 - albumin);
    return {
      id: "anion_gap_albumin_corrected",
      label: "Anion gap (albumin-corrected)",
      value: val,
      unit: "mmol/L",
      precision: 1,
    };
  },
});

register({
  id: "winters_pco2",
  label: "Expected pCO₂ (Winter's)",
  inputs: [{ key: "HCO3", required: true }],
  run: ({ HCO3 }) => {
    if (HCO3 == null) return null;
    const val = 1.5 * HCO3 + 8;
    return { id: "winters_pco2", label: "Expected pCO₂", value: val, unit: "mmHg", precision: 1 };
  },
});
