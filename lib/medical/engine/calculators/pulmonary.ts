import { register } from "../registry";

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

register({
  id: "a_a_gradient",
  label: "A–a gradient",
  inputs: [
    { key: "PaO2", required: true },
    { key: "FiO2", required: true },
    { key: "PaCO2", required: true },
    { key: "age" },
  ],
  run: ({ PaO2, FiO2, PaCO2, age }) => {
    if (PaO2 == null || FiO2 == null || PaCO2 == null) return null;
    const PAO2 = FiO2 * (760 - 47) - PaCO2 / 0.8;
    const gradient = PAO2 - PaO2;
    const expected = age != null ? (age / 4 + 4) : undefined;
    const notes = expected != null && gradient > expected ? ["elevated"] : [];
    return { id: "a_a_gradient", label: "A–a gradient", value: gradient, unit: "mmHg", precision: 0, notes };
  },
});
