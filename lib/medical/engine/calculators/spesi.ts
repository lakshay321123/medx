export type sPESIInputs = {
  age_years: number;
  cancer: boolean;
  chronic_cardiopulmonary: boolean;
  hr_bpm: number;
  sbp_mm_hg: number;
  spo2_percent: number;
};

export function calc_spesi(i: sPESIInputs): { score: number; risk: "low"|"high" } {
  let s = 0;
  if (i.age_years > 80) s += 1;
  if (i.cancer) s += 1;
  if (i.chronic_cardiopulmonary) s += 1;
  if (i.hr_bpm >= 110) s += 1;
  if (i.sbp_mm_hg < 100) s += 1;
  if (i.spo2_percent < 90) s += 1;
  return { score: s, risk: s === 0 ? "low" : "high" };
}

const def = {
  id: "spesi",
  label: "Simplified PESI (sPESI)",
  inputs: [
    { id: "age_years", label: "Age (years)", type: "number", min: 0, max: 120 },
    { id: "cancer", label: "Active cancer", type: "boolean" },
    { id: "chronic_cardiopulmonary", label: "Chronic cardiopulmonary disease", type: "boolean" },
    { id: "hr_bpm", label: "Heart rate (bpm)", type: "number", min: 0, max: 300 },
    { id: "sbp_mm_hg", label: "Systolic BP (mmHg)", type: "number", min: 0, max: 300 },
    { id: "spo2_percent", label: "O₂ saturation (%)", type: "number", min: 0, max: 100 }
  ],
  run: (args: sPESIInputs) => {
    const r = calc_spesi(args);
    const notes = [r.risk === "low" ? "sPESI 0 = low risk" : "high risk"];
    return { id: "spesi", label: "sPESI", value: r.score, unit: "points", precision: 0, notes, extra: r };
  },
};

export default def;
