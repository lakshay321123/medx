import { register } from "../registry";

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
    const val = Na + (K ?? 0) - (Cl + HCO3);
    return { id: "anion_gap", label: "Anion gap", value: val, unit: "mmol/L", precision: 1 };
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
