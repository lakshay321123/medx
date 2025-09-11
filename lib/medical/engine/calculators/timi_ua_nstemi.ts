export type TIMIUAInputs = {
  age_ge_65: boolean;
  at_least_3_risk_factors_cad: boolean;
  known_cad_stenosis_ge_50: boolean;
  asa_in_last_7d: boolean;
  recent_severe_angina: boolean;
  st_deviation_ge_0_5mm: boolean;
  positive_biomarker: boolean;
};

export function calc_timi_ua_nstemi(i: TIMIUAInputs): { score: number; risk: "low"|"intermediate"|"high" } {
  let s = 0;
  if (i.age_ge_65) s += 1;
  if (i.at_least_3_risk_factors_cad) s += 1;
  if (i.known_cad_stenosis_ge_50) s += 1;
  if (i.asa_in_last_7d) s += 1;
  if (i.recent_severe_angina) s += 1;
  if (i.st_deviation_ge_0_5mm) s += 1;
  if (i.positive_biomarker) s += 1;
  let risk: "low"|"intermediate"|"high" = "low";
  if (s >= 5) risk = "high";
  else if (s >= 3) risk = "intermediate";
  return { score: s, risk };
}

const def = {
  id: "timi_ua_nstemi",
  label: "TIMI Risk Score (UA/NSTEMI)",
  inputs: [
    { id: "age_ge_65", label: "Age ≥65", type: "boolean" },
    { id: "at_least_3_risk_factors_cad", label: "≥3 CAD risk factors", type: "boolean" },
    { id: "known_cad_stenosis_ge_50", label: "Known CAD (stenosis ≥50%)", type: "boolean" },
    { id: "asa_in_last_7d", label: "ASA use in last 7 days", type: "boolean" },
    { id: "recent_severe_angina", label: "≥2 angina episodes in 24h", type: "boolean" },
    { id: "st_deviation_ge_0_5mm", label: "ST deviation ≥0.5 mm", type: "boolean" },
    { id: "positive_biomarker", label: "Positive cardiac marker", type: "boolean" }
  ],
  run: (args: TIMIUAInputs) => {
    const r = calc_timi_ua_nstemi(args);
    const notes = [r.risk];
    return { id: "timi_ua_nstemi", label: "TIMI UA/NSTEMI", value: r.score, unit: "points", precision: 0, notes, extra: r };
  },
};

export default def;
