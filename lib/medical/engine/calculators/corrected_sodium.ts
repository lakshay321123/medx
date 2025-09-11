// Batch 14 calculator
export type CorrNaInputs = { measured_na_mmol_l: number; glucose_mg_dl: number };

export function calc_corrected_sodium({ measured_na_mmol_l, glucose_mg_dl }: CorrNaInputs): number {
  return measured_na_mmol_l + 1.6 * ((glucose_mg_dl - 100) / 100);
}

const def = {
  id: "corrected_sodium",
  label: "Corrected Sodium (hyperglycemia)",
  inputs: [
    { id: "measured_na_mmol_l", label: "Measured Na (mmol/L)", type: "number", min: 80, max: 200 },
    { id: "glucose_mg_dl", label: "Glucose (mg/dL)", type: "number", min: 0 }
  ],
  run: (args: CorrNaInputs) => {
    const v = calc_corrected_sodium(args);
    return { id: "corrected_sodium", label: "Corrected Sodium", value: v, unit: "mmol/L", precision: 1, notes: [] };
  },
};

export default def;
