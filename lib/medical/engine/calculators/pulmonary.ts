import { register } from "../registry";

// PF ratio = PaO2 / FiO2 (FiO2 as fraction 0–1)
register({
  id: "pf_ratio",
  label: "PF ratio",
  inputs: [
    { key: "PaO2", required: true },
    { key: "FiO2", required: true },
  ],
  run: ({ PaO2, FiO2 }) => {
    if (!FiO2 || FiO2 <= 0) return null;
    const val = PaO2! / FiO2;
    const notes: string[] = [];
    if (val < 200) notes.push("severe hypoxemia");
    else if (val < 300) notes.push("moderate hypoxemia");
    return { id: "pf_ratio", label: "PF ratio", value: val, precision: 0, notes };
  },
});

