// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

export type RCRIInputs = {
  high_risk_surgery: boolean;
  ischemic_hd: boolean;
  chf: boolean;
  cerebrovascular_disease: boolean;
  insulin_tx: boolean;
  creatinine_mg_dl: number; // >2.0 gets a point
};

export function calc_rcri(i: RCRIInputs): { score: number; risk: "low"|"elevated"|"high" } {
  let s = 0;
  if (i.high_risk_surgery) s += 1;
  if (i.ischemic_hd) s += 1;
  if (i.chf) s += 1;
  if (i.cerebrovascular_disease) s += 1;
  if (i.insulin_tx) s += 1;
  if (i.creatinine_mg_dl > 2.0) s += 1;
  let risk: "low"|"elevated"|"high" = "low";
  if (s >= 3) risk = "high";
  else if (s >= 1) risk = "elevated";
  return { score: s, risk };
}

const def = {
  id: "rcri",
  label: "Revised Cardiac Risk Index (RCRI)",
  inputs: [
    { id: "high_risk_surgery", label: "High-risk surgery", type: "boolean" },
    { id: "ischemic_hd", label: "History of ischemic heart disease", type: "boolean" },
    { id: "chf", label: "History of CHF", type: "boolean" },
    { id: "cerebrovascular_disease", label: "History of cerebrovascular disease", type: "boolean" },
    { id: "insulin_tx", label: "Diabetes on insulin", type: "boolean" },
    { id: "creatinine_mg_dl", label: "Creatinine (mg/dL)", type: "number", min: 0 }
  ],
  run: (args: RCRIInputs) => {
    const r = calc_rcri(args);
    const notes = [r.risk];
    return { id: "rcri", label: "RCRI", value: r.score, unit: "points", precision: 0, notes, extra: r };
  },
};

export default def;
