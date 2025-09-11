// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.


export type TIMIInputs = {
  age_years: number;
  cad_risk_factors_count: number; // e.g., family hx, HTN, HLD, DM, smoker
  known_cad_stenosis_ge_50: boolean;
  aspirin_in_last_7d: boolean;
  severe_angina_2plus_24h: boolean;
  st_deviation_ge_0_5mm: boolean;
  elevated_markers: boolean;
};

export function calc_timi_ua_nstemi(i: TIMIInputs): number {
  let s = 0;
  if (i.age_years >= 65) s += 1;
  if (i.cad_risk_factors_count >= 3) s += 1;
  if (i.known_cad_stenosis_ge_50) s += 1;
  if (i.aspirin_in_last_7d) s += 1;
  if (i.severe_angina_2plus_24h) s += 1;
  if (i.st_deviation_ge_0_5mm) s += 1;
  if (i.elevated_markers) s += 1;
  return s;
}

const def = {
  id: "timi_ua_nstemi",
  label: "TIMI (UA/NSTEMI)",
  inputs: [
    { id: "age_years", label: "Age", type: "number", min: 0, max: 120 },
    { id: "cad_risk_factors_count", label: "CAD risk factors (count)", type: "number", min: 0, max: 10, step: 1 },
    { id: "known_cad_stenosis_ge_50", label: "Known CAD ≥50% stenosis", type: "boolean" },
    { id: "aspirin_in_last_7d", label: "Aspirin in last 7d", type: "boolean" },
    { id: "severe_angina_2plus_24h", label: "Severe angina ≥2 episodes/24h", type: "boolean" },
    { id: "st_deviation_ge_0_5mm", label: "ST deviation ≥0.5 mm", type: "boolean" },
    { id: "elevated_markers", label: "Elevated cardiac markers", type: "boolean" }
  ],
  run: (args: TIMIInputs) => {
    const v = calc_timi_ua_nstemi(args);
    return { id: "timi_ua_nstemi", label: "TIMI (UA/NSTEMI)", value: v, unit: "score", precision: 0, notes: [] };
  },
};

export default def;
