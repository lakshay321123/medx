export type LDLInputs = { total_chol_mg_dl: number; hdl_mg_dl: number; triglycerides_mg_dl: number };

export function calc_ldl_friedewald({ total_chol_mg_dl, hdl_mg_dl, triglycerides_mg_dl }: LDLInputs): number {
  if (triglycerides_mg_dl >= 400) return NaN;
  return total_chol_mg_dl - hdl_mg_dl - (triglycerides_mg_dl / 5);
}

const def = {
  id: "ldl_friedewald",
  label: "LDL (Friedewald)",
  inputs: [
    { id: "total_chol_mg_dl", label: "Total cholesterol (mg/dL)", type: "number", min: 0 },
    { id: "hdl_mg_dl", label: "HDL (mg/dL)", type: "number", min: 0 },
    { id: "triglycerides_mg_dl", label: "Triglycerides (mg/dL)", type: "number", min: 0 }
  ],
  run: (args: LDLInputs) => {
    const v = calc_ldl_friedewald(args);
    const notes = [Number.isNaN(v) ? "TG ≥400 mg/dL — formula invalid" : ""];
    return { id: "ldl_friedewald", label: "LDL (Friedewald)", value: v, unit: "mg/dL", precision: 0, notes: notes.filter(Boolean) };
  },
};

export default def;
