// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.


export type HEARTInputs = {
  history: "slight" | "moderate" | "high";
  ecg: "normal" | "nonspecific" | "st_depression";
  age_years: number;
  risk_factors_count: number;
  known_atherosclerotic_disease: boolean;
  troponin_multiple_uln: number; // ratio to ULN
};

export function calc_heart(i: HEARTInputs): number {
  let s = 0;
  // History
  s += (i.history === "high") ? 2 : (i.history === "moderate" ? 1 : 0);
  // ECG
  s += (i.ecg === "st_depression") ? 2 : (i.ecg === "nonspecific" ? 1 : 0);
  // Age
  if (i.age_years >= 65) s += 2; else if (i.age_years >= 45) s += 1;
  // Risk factors
  if (i.known_atherosclerotic_disease || i.risk_factors_count >= 3) s += 2;
  else if (i.risk_factors_count >= 1) s += 1;
  // Troponin
  if (i.troponin_multiple_uln > 3) s += 2;
  else if (i.troponin_multiple_uln > 1) s += 1;
  return s;
}

const def = {
  id: "heart_score",
  label: "HEART Score (Chest Pain)",
  inputs: [
    { id: "history", label: "History", type: "select", options: [
      {label:"Slightly suspicious", value:"slight"},
      {label:"Moderately suspicious", value:"moderate"},
      {label:"Highly suspicious", value:"high"}
    ]},
    { id: "ecg", label: "ECG", type: "select", options: [
      {label:"Normal", value:"normal"},
      {label:"Nonspecific repolarization", value:"nonspecific"},
      {label:"ST depression", value:"st_depression"}
    ]},
    { id: "age_years", label: "Age (years)", type: "number", min: 0, max: 120 },
    { id: "risk_factors_count", label: "Risk factors (count)", type: "number", min: 0, max: 10, step: 1 },
    { id: "known_atherosclerotic_disease", label: "Known atherosclerotic disease", type: "boolean" },
    { id: "troponin_multiple_uln", label: "Troponin (×ULN)", type: "number", min: 0 }
  ],
  run: (args: HEARTInputs) => {
    const v = calc_heart(args);
    const notes = [v <= 3 ? "low risk" : v <= 6 ? "moderate risk" : "high risk"];
    return { id: "heart_score", label: "HEART Score", value: v, unit: "score", precision: 0, notes };
  },
};

export default def;
