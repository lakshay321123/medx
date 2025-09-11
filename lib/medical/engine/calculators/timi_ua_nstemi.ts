// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

export type TIMIUANSTEMIInputs = {
  age_ge_65: boolean;
  cad_risk_factors_count: number;
  known_cad_ge_50_stenosis: boolean;
  asa_use_last_7d: boolean;
  recent_severe_angina: boolean;
  st_deviation_ge_0_5mm: boolean;
  positive_biomarker: boolean;
};

export function calc_timi_ua_nstemi(i: TIMIUANSTEMIInputs): number {
  let s = 0;
  if (i.age_ge_65) s += 1;
  if (i.cad_risk_factors_count >= 3) s += 1;
  if (i.known_cad_ge_50_stenosis) s += 1;
  if (i.asa_use_last_7d) s += 1;
  if (i.recent_severe_angina) s += 1;
  if (i.st_deviation_ge_0_5mm) s += 1;
  if (i.positive_biomarker) s += 1;
  return s;
}

const def = {
  id: "timi_ua_nstemi",
  label: "TIMI (UA/NSTEMI)",
  inputs: [
    { id: "age_ge_65", label: "Age ≥65", type: "boolean" },
    { id: "cad_risk_factors_count", label: "CAD risk factors (count)", type: "number", min: 0, max: 10, step: 1 },
    { id: "known_cad_ge_50_stenosis", label: "Known CAD ≥50% stenosis", type: "boolean" },
    { id: "asa_use_last_7d", label: "Aspirin use in last 7 days", type: "boolean" },
    { id: "recent_severe_angina", label: "≥2 angina episodes in 24h", type: "boolean" },
    { id: "st_deviation_ge_0_5mm", label: "ST deviation ≥0.5 mm", type: "boolean" },
    { id: "positive_biomarker", label: "Positive cardiac marker", type: "boolean" }
  ],
  run: (args: TIMIUANSTEMIInputs) => {
    const v = calc_timi_ua_nstemi(args);
    return { id: "timi_ua_nstemi", label: "TIMI (UA/NSTEMI)", value: v, unit: "points", precision: 0, notes: [] };
  },
};

export default def;
