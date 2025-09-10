/**
 * Sodium correction rate planning aid.
 * rate_mEq_per_hr = (targetNa - currentNa) / hours
 * Safety bands (typical convention):
 *  - OK:        < 8 mEq/L per 24h
 *  - CAUTION:   8–<10 mEq/L per 24h
 *  - UNSAFE:    ≥10 mEq/L per 24h
 */
export interface NaCorrectionInput {
  current_na: number;
  target_na: number;
  hours: number;
}
export interface NaCorrectionResult {
  rate_meq_per_hr: number;
  projected_24h_change: number;
  safety_flag: "ok" | "caution" | "unsafe";
}
export function runSodiumCorrectionRate(i: NaCorrectionInput): NaCorrectionResult {
  const rate = (i.target_na - i.current_na) / i.hours;
  const proj24 = rate * 24;

  let flag: NaCorrectionResult["safety_flag"];
  if (proj24 >= 10) flag = "unsafe";
  else if (proj24 >= 8) flag = "caution";
  else flag = "ok";

  return { rate_meq_per_hr: rate, projected_24h_change: proj24, safety_flag: flag };
}
