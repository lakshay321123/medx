export type CorrNaInputs = { measured_na_mmol_l: number; glucose_mg_dl: number; factor_per_100?: number };

export function calc_corrected_sodium(i: CorrNaInputs): number {
  const factor = typeof i.factor_per_100 === "number" ? i.factor_per_100 : 1.6;
  const delta = Math.max(0, i.glucose_mg_dl - 100);
  return i.measured_na_mmol_l + factor * (delta / 100);
}

const def = {
  id: "corrected_sodium",
  label: "Corrected Sodium (hyperglycemia)",
  inputs: [
    { id: "measured_na_mmol_l", label: "Measured Na (mmol/L)", type: "number", min: 80, max: 200 },
    { id: "glucose_mg_dl", label: "Glucose (mg/dL)", type: "number", min: 0, max: 2000 },
    { id: "factor_per_100", label: "Correction per +100 mg/dL (default 1.6)", type: "number", min: 0, max: 5 }
  ],
  run: (args: CorrNaInputs) => {
    const v = calc_corrected_sodium(args);
    return { id: "corrected_sodium", label: "Corrected Na", value: v, unit: "mmol/L", precision: 1, notes: [] };
  },
};

export default def;
