export type CRBInputs = {
  confusion: boolean;
  resp_rate: number;
  sbp: number;
  dbp: number;
  age_years: number;
};

export function calc_crb65(i: CRBInputs): number {
  let s = 0;
  s += i.confusion ? 1 : 0;
  s += i.resp_rate >= 30 ? 1 : 0;
  s += (i.sbp < 90 || i.dbp <= 60) ? 1 : 0;
  s += i.age_years >= 65 ? 1 : 0;
  return s;
}

const def = {
  id: "crb65",
  label: "CRB-65 (pneumonia severity)",
  inputs: [
    { id: "confusion", label: "Confusion", type: "boolean" },
    { id: "resp_rate", label: "Respiratory rate (breaths/min)", type: "number", min: 0 },
    { id: "sbp", label: "Systolic BP (mmHg)", type: "number", min: 0 },
    { id: "dbp", label: "Diastolic BP (mmHg)", type: "number", min: 0 },
    { id: "age_years", label: "Age (years)", type: "number", min: 0 }
  ],
  run: (args: CRBInputs) => {
    const v = calc_crb65(args);
    return { id: "crb65", label: "CRB-65", value: v, unit: "points", precision: 0, notes: [] };
  },
};

export default def;
