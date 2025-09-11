export type CorrPhenyInputs = { total_phenytoin_mcg_ml: number; albumin_g_dl: number; esrd: boolean };

export function calc_corrected_phenytoin(i: CorrPhenyInputs): number {
  const denom = (i.esrd ? (0.1 * i.albumin_g_dl + 0.1) : (0.2 * i.albumin_g_dl + 0.1));
  if (denom <= 0) return NaN;
  return i.total_phenytoin_mcg_ml / denom;
}

const def = {
  id: "corrected_phenytoin",
  label: "Corrected Phenytoin (Sheiner–Tozer)",
  inputs: [
    { id: "total_phenytoin_mcg_ml", label: "Total phenytoin (μg/mL)", type: "number", min: 0 },
    { id: "albumin_g_dl", label: "Albumin (g/dL)", type: "number", min: 0 },
    { id: "esrd", label: "ESRD / CrCl <20 mL/min", type: "boolean" }
  ],
  run: (args: CorrPhenyInputs) => {
    const v = calc_corrected_phenytoin(args);
    return { id: "corrected_phenytoin", label: "Corrected Phenytoin", value: v, unit: "μg/mL", precision: 1, notes: [] };
  },
};

export default def;
