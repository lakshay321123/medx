// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

export type CURB65Inputs = {
  confusion: boolean;
  urea_mmol_l: number;
  resp_rate: number;
  sbp: number;
  dbp: number;
  age_years: number;
};

export function calc_curb65({ confusion, urea_mmol_l, resp_rate, sbp, dbp, age_years }: CURB65Inputs): number {
  let s = 0;
  if (confusion) s += 1;
  if (urea_mmol_l > 7) s += 1;
  if (resp_rate >= 30) s += 1;
  if (sbp < 90 || dbp <= 60) s += 1;
  if (age_years >= 65) s += 1;
  return s;
}

const def = {
  id: "curb65",
  label: "CURB-65 (Pneumonia)",
  inputs: [
    { id: "confusion", label: "Confusion", type: "boolean" },
    { id: "urea_mmol_l", label: "Urea (mmol/L)", type: "number", min: 0 },
    { id: "resp_rate", label: "Respiratory rate (/min)", type: "number", min: 0 },
    { id: "sbp", label: "Systolic BP (mmHg)", type: "number", min: 0 },
    { id: "dbp", label: "Diastolic BP (mmHg)", type: "number", min: 0 },
    { id: "age_years", label: "Age (years)", type: "number", min: 0, max: 120 }
  ],
  run: (args: CURB65Inputs) => {
    const v = calc_curb65(args);
    return { id: "curb65", label: "CURB-65", value: v, unit: "score", precision: 0, notes: [] };
  },
};

export default def;
