// Auto-generated. No placeholders. Typed run(args).
export type SchwartzInputs = {
  height_cm: number;
  creatinine_mg_dl: number;
};

export function calc_schwartz_egfr({ height_cm, creatinine_mg_dl }: SchwartzInputs): number {
  if (creatinine_mg_dl <= 0) return NaN;
  return 0.413 * height_cm / creatinine_mg_dl;
}

const def = {
  id: "schwartz_egfr",
  label: "eGFR (Schwartz bedside, pediatric)",
  inputs: [
    { id: "height_cm", label: "Height (cm)", type: "number", min: 30, max: 220 },
    { id: "creatinine_mg_dl", label: "Creatinine (mg/dL)", type: "number", min: 0 }
  ],
  run: (args: SchwartzInputs) => {
    const v = calc_schwartz_egfr(args);
    return { id: "schwartz_egfr", label: "eGFR (Schwartz)", value: v, unit: "mL/min/1.73m²", precision: 0, notes: [] };
  },
};

export default def;
