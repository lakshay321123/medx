/**
 * TIMI risk score for UA/NSTEMI (0–7)
 * Criteria: age >=65, 3+ risk factors, known CAD >=50, ASA in last 7 days,
 * severe angina (>=2 episodes/24h), ST deviation >=0.5 mm, positive markers.
 */
export interface TIMIInput {
  age_ge_65: boolean;
  risk_factors_ge_3: boolean;
  known_cad_ge_50: boolean;
  asa_last_7d: boolean;
  severe_angina_2plus_24h: boolean;
  st_deviation: boolean;
  positive_markers: boolean;
}
export interface TIMIResult { score: number; band: "low" | "intermediate" | "high"; }
export function runTIMI(i: TIMIInput): TIMIResult {
  const s = [i.age_ge_65, i.risk_factors_ge_3, i.known_cad_ge_50, i.asa_last_7d, i.severe_angina_2plus_24h, i.st_deviation, i.positive_markers].filter(Boolean).length;
  let b: TIMIResult["band"] = "low";
  if (s >= 5) b = "high";
  else if (s >= 3) b = "intermediate";
  return { score: s, band: b };
}
