import { register } from "../registry";

// Winter's formula: expected pCO2 = 1.5*HCO3 + 8 ±2
register({
  id: "winters",
  label: "Expected pCO₂ (Winter’s)",
  inputs: [{ key: "HCO3", required: true }],
  run: ({ HCO3 }) => {
    const exp = 1.5 * (HCO3!) + 8;
    return { id: "winters", label: "Expected pCO₂ (Winter’s)", value: exp, unit: "mmHg", precision: 0, notes: ["±2 mmHg"] };
  },
});

