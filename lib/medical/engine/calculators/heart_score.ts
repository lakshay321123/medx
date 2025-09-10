/**
 * HEART score 0–10
 * Caller passes component points:
 * - history_score 0/1/2
 * - ecg_score 0/1/2
 * - age_score 0/1/2
 * - risk_factors_score 0/1/2
 * - troponin_score 0/1/2
 */
export interface HEARTInput {
  history_score: 0|1|2;
  ecg_score: 0|1|2;
  age_score: 0|1|2;
  risk_factors_score: 0|1|2;
  troponin_score: 0|1|2;
}
export interface HEARTResult { score: number; band: "low" | "moderate" | "high"; }
export function runHEART(i: HEARTInput): HEARTResult {
  const s = i.history_score + i.ecg_score + i.age_score + i.risk_factors_score + i.troponin_score;
  let b: HEARTResult["band"] = "low";
  if (s >= 7) b = "high";
  else if (s >= 4) b = "moderate";
  return { score: s, band: b };
}
