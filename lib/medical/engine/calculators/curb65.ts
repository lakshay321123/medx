export type CURBInputs = {
  confusion: boolean;
  urea_mmol_l: number;
  resp_rate: number;
  sbp: number;
  dbp: number;
  age_years: number;
};

export function calc_curb65(i: CURBInputs): number {
  let s = 0;
  s += i.confusion ? 1 : 0;
  s += i.urea_mmol_l >= 7 ? 1 : 0;
  s += i.resp_rate >= 30 ? 1 : 0;
  s += (i.sbp < 90 || i.dbp <= 60) ? 1 : 0;
  s += i.age_years >= 65 ? 1 : 0;
  return s;
}

const def = {
  id: "curb65",
  label: "CURB-65 (pneumonia severity)",
  inputs: [
    { id: "confusion", label: "Confusion", type: "boolean" },
    { id: "urea_mmol_l", label: "Urea (mmol/L)", type: "number", min: 0 },
    { id: "resp_rate", label: "Respiratory rate (breaths/min)", type: "number", min: 0 },
    { id: "sbp", label: "Systolic BP (mmHg)", type: "number", min: 0 },
    { id: "dbp", label: "Diastolic BP (mmHg)", type: "number", min: 0 },
    { id: "age_years", label: "Age (years)", type: "number", min: 0 }
  ],
  run: (args: CURBInputs) => {
    const v = calc_curb65(args);
    return { id: "curb65", label: "CURB-65", value: v, unit: "points", precision: 0, notes: [] };
  },
};

export default def;
