export type TIMIInputs = {
  age_ge_65: boolean;
  at_least_3_risk_factors_cad: boolean;
  known_cad_ge_50_stenosis: boolean;
  st_deviation: boolean;
  two_angina_episodes_24h: boolean;
  aspirin_last_7d: boolean;
  elevated_markers: boolean;
};

export function calc_timi_ua_nstemi(i: TIMIInputs): number {
  let s = 0;
  s += i.age_ge_65 ? 1 : 0;
  s += i.at_least_3_risk_factors_cad ? 1 : 0;
  s += i.known_cad_ge_50_stenosis ? 1 : 0;
  s += i.st_deviation ? 1 : 0;
  s += i.two_angina_episodes_24h ? 1 : 0;
  s += i.aspirin_last_7d ? 1 : 0;
  s += i.elevated_markers ? 1 : 0;
  return s;
}

const def = {
  id: "timi_ua_nstemi",
  label: "TIMI (UA/NSTEMI)",
  inputs: [
    { id: "age_ge_65", label: "Age ≥65", type: "boolean" },
    { id: "at_least_3_risk_factors_cad", label: "≥3 risk factors for CAD", type: "boolean" },
    { id: "known_cad_ge_50_stenosis", label: "Known CAD ≥50% stenosis", type: "boolean" },
    { id: "st_deviation", label: "ST deviation ≥0.5 mm", type: "boolean" },
    { id: "two_angina_episodes_24h", label: "≥2 angina episodes in last 24h", type: "boolean" },
    { id: "aspirin_last_7d", label: "Aspirin use in last 7 days", type: "boolean" },
    { id: "elevated_markers", label: "Elevated cardiac markers", type: "boolean" }
  ],
  run: (args: TIMIInputs) => {
    const v = calc_timi_ua_nstemi(args);
    return { id: "timi_ua_nstemi", label: "TIMI (UA/NSTEMI)", value: v, unit: "points", precision: 0, notes: [] };
  },
};

export default def;
