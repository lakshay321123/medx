// Auto-generated. No placeholders. Typed run(args).
export type FeUreaInputs = {
  urine_urea_mg_dl: number;
  plasma_urea_mg_dl: number; // BUN
  urine_cr_mg_dl: number;
  plasma_cr_mg_dl: number;
};

export function calc_feurea(i: FeUreaInputs): number {
  if (i.plasma_urea_mg_dl <= 0 || i.urine_cr_mg_dl <= 0) return NaN;
  return (i.urine_urea_mg_dl * i.plasma_cr_mg_dl) / (i.plasma_urea_mg_dl * i.urine_cr_mg_dl) * 100;
}

const def = {
  id: "feurea",
  label: "FeUrea (%)",
  inputs: [
    { id: "urine_urea_mg_dl", label: "Urine urea nitrogen (mg/dL)", type: "number", min: 0 },
    { id: "plasma_urea_mg_dl", label: "Plasma urea (BUN) (mg/dL)", type: "number", min: 0 },
    { id: "urine_cr_mg_dl", label: "Urine Creatinine (mg/dL)", type: "number", min: 0 },
    { id: "plasma_cr_mg_dl", label: "Plasma Creatinine (mg/dL)", type: "number", min: 0 }
  ],
  run: (args: FeUreaInputs) => {
    const v = calc_feurea(args);
    const notes = [v < 35 ? "Suggests prerenal or HF" : "Suggests ATN"];
    return { id: "feurea", label: "FeUrea", value: v, unit: "%", precision: 1, notes };
  },
};

export default def;
