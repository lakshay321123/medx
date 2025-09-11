// Batch 14 calculator
export type ANCInputs = { wbc_k_per_uL: number; neutrophils_percent: number; bands_percent?: number };

export function calc_anc(i: ANCInputs): number {
  const pct = i.neutrophils_percent + (i.bands_percent ?? 0);
  return i.wbc_k_per_uL * 10**3 * (pct/100);
}

const def = {
  id: "anc",
  label: "Absolute Neutrophil Count (ANC)",
  inputs: [
    { id: "wbc_k_per_uL", label: "WBC (×10³/µL)", type: "number", min: 0 },
    { id: "neutrophils_percent", label: "Neutrophils (%)", type: "number", min: 0, max: 100 },
    { id: "bands_percent", label: "Bands (%)", type: "number", min: 0, max: 100 }
  ],
  run: (args: ANCInputs) => {
    const v = calc_anc(args);
    return { id: "anc", label: "ANC", value: v, unit: "/µL", precision: 0, notes: [] };
  },
};

export default def;
