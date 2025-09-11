export type SfsrInputs = {
  history_chf:boolean;
  hematocrit_percent:number;   // <30 triggers
  abnormal_ecg:boolean;
  shortness_of_breath:boolean;
  sbp_mm_hg:number;            // <90 triggers
};
export function calc_sfsr(i: SfsrInputs): { positive:boolean; criteria:string[] } {
  const criteria:string[] = [];
  if (i.history_chf) criteria.push("History of CHF");
  if (i.hematocrit_percent < 30) criteria.push("Hct <30%");
  if (i.abnormal_ecg) criteria.push("Abnormal ECG");
  if (i.shortness_of_breath) criteria.push("Shortness of breath");
  if (i.sbp_mm_hg < 90) criteria.push("SBP <90 mmHg");
  return { positive: criteria.length > 0, criteria };
}
const def = {
  id: "san_francisco_syncope",
  label: "San Francisco Syncope Rule (SFSR)",
  inputs: [
    { id: "history_chf", label: "History of CHF", type: "boolean" },
    { id: "hematocrit_percent", label: "Hematocrit (%)", type: "number", min: 0, max: 60 },
    { id: "abnormal_ecg", label: "Abnormal ECG", type: "boolean" },
    { id: "shortness_of_breath", label: "Shortness of breath", type: "boolean" },
    { id: "sbp_mm_hg", label: "Systolic BP (mmHg)", type: "number", min: 40, max: 260 }
  ],
  run: (args: SfsrInputs) => {
    const r = calc_sfsr(args);
    const notes = [r.positive ? "High risk (CHESS+)" : "Low risk", ...r.criteria];
    return { id: "san_francisco_syncope", label: "SFSR", value: r.positive ? 1 : 0, unit: "flag", precision: 0, notes, extra: r };
  },
};
export default def;
