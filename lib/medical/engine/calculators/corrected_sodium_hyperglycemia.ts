export type CorrNaInputs = { measured_na_mmol_l:number; glucose_mg_dl:number };

export function calc_corrected_sodium_hyperglycemia(i: CorrNaInputs): number {
  // classic 1.6 mmol/L increase per 100 mg/dL glucose above 100
  const delta = Math.max(0, i.glucose_mg_dl - 100) / 100 * 1.6;
  return i.measured_na_mmol_l + delta;
}

const def = {
  id: "corrected_sodium_hyperglycemia",
  label: "Corrected Sodium (hyperglycemia)",
  inputs: [
    { id: "measured_na_mmol_l", label: "Measured Na (mmol/L)", type: "number", min: 80, max: 200 },
    { id: "glucose_mg_dl", label: "Glucose (mg/dL)", type: "number", min: 0 }
  ],
  run: (args: CorrNaInputs) => {
    const v = calc_corrected_sodium_hyperglycemia(args);
    return { id: "corrected_sodium_hyperglycemia", label: "Corrected Na (hyperglycemia)", value: v, unit: "mmol/L", precision: 1, notes: [] };
  },
};

export default def;
