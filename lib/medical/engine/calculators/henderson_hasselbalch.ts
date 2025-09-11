// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

export type HHInputs = { hco3_mmol_l: number; paco2_mm_hg: number };

export function calc_henderson_hasselbalch({ hco3_mmol_l, paco2_mm_hg }: HHInputs): number {
  if (paco2_mm_hg <= 0) return NaN;
  return 6.1 + Math.log10(hco3_mmol_l / (0.03 * paco2_mm_hg));
}

const def = {
  id: "henderson_hasselbalch",
  label: "Henderson–Hasselbalch (arterial pH)",
  inputs: [
    { id: "hco3_mmol_l", label: "HCO3⁻ (mmol/L)", type: "number", min: 0 },
    { id: "paco2_mm_hg", label: "PaCO2 (mmHg)", type: "number", min: 1 }
  ],
  run: (args: HHInputs) => {
    const v = calc_henderson_hasselbalch(args);
    return { id: "henderson_hasselbalch", label: "Henderson–Hasselbalch pH", value: v, unit: "pH", precision: 2, notes: [] };
  },
};

export default def;
