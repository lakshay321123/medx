export type HOMAInputs = { fasting_glucose_mg_dl:number; fasting_insulin_uU_ml:number };

export function calc_homa_ir(i: HOMAInputs): number {
  return (i.fasting_glucose_mg_dl * i.fasting_insulin_uU_ml) / 405;
}

const def = {
  id: "homa_ir",
  label: "HOMA-IR (insulin resistance)",
  inputs: [
    { id: "fasting_glucose_mg_dl", label: "Fasting glucose (mg/dL)", type: "number", min: 0 },
    { id: "fasting_insulin_uU_ml", label: "Fasting insulin (µU/mL)", type: "number", min: 0 }
  ],
  run: (args: HOMAInputs) => {
    const v = calc_homa_ir(args);
    return { id: "homa_ir", label: "HOMA-IR", value: v, unit: "", precision: 2, notes: [] };
  },
};

export default def;
