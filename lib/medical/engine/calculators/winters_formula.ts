export type WintersInputs = { hco3_mmol_l:number };

export function calc_winters(i: WintersInputs): { expected_paco2_mm_hg:number; low:number; high:number } {
  const exp = 1.5 * i.hco3_mmol_l + 8;
  const low = exp - 2;
  const high = exp + 2;
  return { expected_paco2_mm_hg: exp, low, high };
}

const def = {
  id: "winters_formula",
  label: "Winter's Formula (expected PaCO₂)",
  inputs: [
    { id: "hco3_mmol_l", label: "HCO₃⁻ (mmol/L)", type: "number", min: 0, max: 50 }
  ],
  run: (args: WintersInputs) => {
    const r = calc_winters(args);
    const notes = [`Expected PaCO₂ ${r.low.toFixed(1)}–${r.high.toFixed(1)} mmHg`];
    return { id: "winters_formula", label: "Winter's Formula", value: r.expected_paco2_mm_hg, unit: "mmHg", precision: 1, notes, extra: r };
  },
};

export default def;
