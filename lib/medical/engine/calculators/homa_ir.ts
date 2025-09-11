// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.


export type HOMAInputs = {
  fasting_glucose_mg_dl: number;
  fasting_insulin_uU_ml: number;
};

export function calc_homa_ir({ fasting_glucose_mg_dl, fasting_insulin_uU_ml }: HOMAInputs): number {
  const glucose_mmol_l = fasting_glucose_mg_dl / 18;
  return (glucose_mmol_l * fasting_insulin_uU_ml) / 22.5;
}

const def = {
  id: "homa_ir",
  label: "HOMA-IR",
  inputs: [
    { id: "fasting_glucose_mg_dl", label: "Fasting glucose (mg/dL)", type: "number", min: 0 },
    { id: "fasting_insulin_uU_ml", label: "Fasting insulin (µU/mL)", type: "number", min: 0 }
  ],
  run: (args: HOMAInputs) => {
    const v = calc_homa_ir(args);
    return { id: "homa_ir", label: "HOMA-IR", value: v, unit: "index", precision: 2, notes: [] };
  },
};

export default def;
