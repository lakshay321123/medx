// Auto-generated. No placeholders. Typed run(args).
export type NaCorrInputs = {
  measured_na_mmol_l: number;
  glucose_mg_dl: number;
};

export function calc_corrected_na({ measured_na_mmol_l, glucose_mg_dl }: NaCorrInputs): number {
  const delta = Math.max(glucose_mg_dl - 100, 0);
  return measured_na_mmol_l + 1.6 * (delta / 100);
}

const def = {
  id: "sodium_correction_hyperglycemia",
  label: "Corrected Sodium (hyperglycemia)",
  inputs: [
    { id: "measured_na_mmol_l", label: "Measured Na (mmol/L)", type: "number", min: 80, max: 200 },
    { id: "glucose_mg_dl", label: "Glucose (mg/dL)", type: "number", min: 0 }
  ],
  run: (args: NaCorrInputs) => {
    const v = calc_corrected_na(args);
    return { id: "sodium_correction_hyperglycemia", label: "Corrected Na", value: v, unit: "mmol/L", precision: 1, notes: [] };
  },
};

export default def;
