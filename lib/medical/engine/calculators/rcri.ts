// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.

export type RCRIInputs = {
  high_risk_surgery: boolean;
  history_ischemic_hd: boolean;
  history_chf: boolean;
  history_cvd: boolean;
  insulin_therapy: boolean;
  creatinine_mg_dl: number;
};

export function calc_rcri({
  high_risk_surgery, history_ischemic_hd, history_chf, history_cvd, insulin_therapy, creatinine_mg_dl
}: RCRIInputs): number {
  let score = 0;
  if (high_risk_surgery) score++;
  if (history_ischemic_hd) score++;
  if (history_chf) score++;
  if (history_cvd) score++;
  if (insulin_therapy) score++;
  if (creatinine_mg_dl > 2.0) score++;
  return score;
}

const def = {
  id: "rcri",
  label: "RCRI (Lee)",
  inputs: [
    { id: "high_risk_surgery", label: "High-risk surgery", type: "boolean" },
    { id: "history_ischemic_hd", label: "Ischemic heart disease", type: "boolean" },
    { id: "history_chf", label: "CHF history", type: "boolean" },
    { id: "history_cvd", label: "Cerebrovascular disease", type: "boolean" },
    { id: "insulin_therapy", label: "Insulin therapy", type: "boolean" },
    { id: "creatinine_mg_dl", label: "Creatinine (mg/dL)", type: "number", min: 0 }
  ],
  run: (args: RCRIInputs) => {
    const v = calc_rcri(args);
    return { id: "rcri", label: "RCRI (Lee)", value: v, unit: "score", precision: 0, notes: [] };
  },
};

export default def;
