// Auto-generated fix. No placeholders. Typed run(args).
export type WintersInputs = { hco3_mmol_l: number };

export function calc_winters({ hco3_mmol_l }: WintersInputs): { expected_paco2_mm_hg: number; low: number; high: number } {
  const exp = 1.5 * hco3_mmol_l + 8;
  return { expected_paco2_mm_hg: exp, low: exp - 2, high: exp + 2 };
}

const def = {
  id: "winters_formula",
  label: "Winter's Formula (expected PaCO2)",
  inputs: [
    { id: "hco3_mmol_l", label: "HCO3⁻ (mmol/L)", type: "number", min: 0, max: 60 }
  ],
  run: (args: WintersInputs) => {
    const r = calc_winters(args);
    const notes = [`Expected PaCO2 ${r.low.toFixed(1)}–${r.high.toFixed(1)} mmHg`];
    return { id: "winters_formula", label: "Winter's Formula", value: r.expected_paco2_mm_hg, unit: "mmHg", precision: 1, notes, extra: r };
  },
};

export default def;
