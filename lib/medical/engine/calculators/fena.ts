// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

export type FENaInputs = { una_mmol_l: number; pna_mmol_l: number; ucr_mg_dl: number; pcr_mg_dl: number };

export function calc_fena({ una_mmol_l, pna_mmol_l, ucr_mg_dl, pcr_mg_dl }: FENaInputs): number {
  if (pna_mmol_l <= 0 || ucr_mg_dl <= 0 || pcr_mg_dl <= 0) return NaN;
  return (una_mmol_l * pcr_mg_dl) / (pna_mmol_l * ucr_mg_dl) * 100;
}

const def = {
  id: "fena",
  label: "Fractional Excretion of Sodium (FENa)",
  inputs: [
    { id: "una_mmol_l", label: "Urine Na (mmol/L)", type: "number", min: 0 },
    { id: "pna_mmol_l", label: "Plasma Na (mmol/L)", type: "number", min: 1 },
    { id: "ucr_mg_dl", label: "Urine Creatinine (mg/dL)", type: "number", min: 1 },
    { id: "pcr_mg_dl", label: "Plasma Creatinine (mg/dL)", type: "number", min: 0.1 }
  ],
  run: (args: FENaInputs) => {
    const v = calc_fena(args);
    return { id: "fena", label: "FENa", value: v, unit: "%", precision: 2, notes: [] };
  },
};

export default def;
