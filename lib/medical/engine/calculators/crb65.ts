// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

export type CRB65Inputs = {
  confusion: boolean;
  resp_rate: number;
  sbp: number;
  dbp: number;
  age_years: number;
};

export function calc_crb65({ confusion, resp_rate, sbp, dbp, age_years }: CRB65Inputs): number {
  let s = 0;
  if (confusion) s += 1;
  if (resp_rate >= 30) s += 1;
  if (sbp < 90 || dbp <= 60) s += 1;
  if (age_years >= 65) s += 1;
  return s;
}

const def = {
  id: "crb65",
  label: "CRB-65 (Pneumonia; no labs)",
  inputs: [
    { id: "confusion", label: "Confusion", type: "boolean" },
    { id: "resp_rate", label: "Respiratory rate (/min)", type: "number", min: 0 },
    { id: "sbp", label: "Systolic BP (mmHg)", type: "number", min: 0 },
    { id: "dbp", label: "Diastolic BP (mmHg)", type: "number", min: 0 },
    { id: "age_years", label: "Age (years)", type: "number", min: 0, max: 120 }
  ],
  run: (args: CRB65Inputs) => {
    const v = calc_crb65(args);
    return { id: "crb65", label: "CRB-65", value: v, unit: "score", precision: 0, notes: [] };
  },
};

export default def;
