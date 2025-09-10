/**
 * Apfel PONV risk score (0–4)
 * 1 point each: female sex, non-smoker, history PONV/motion sickness, post-op opioids planned
 * Common probability table approximation: 0≈10%, 1≈20%, 2≈40%, 3≈60%, 4≈80%
 */
export interface ApfelInput {
  female: boolean;
  non_smoker: boolean;
  history_ponv_or_motion_sickness: boolean;
  postop_opioids_planned: boolean;
}
export interface ApfelResult {
  score: number;
  risk_percent: number;
}

export function runApfelPONV(i: ApfelInput): ApfelResult {
  let s = 0;
  if (i.female) s += 1;
  if (i.non_smoker) s += 1;
  if (i.history_ponv_or_motion_sickness) s += 1;
  if (i.postop_opioids_planned) s += 1;

  const table = [10, 20, 40, 60, 80];
  const risk = table[Math.max(0, Math.min(4, s))];
  return { score: s, risk_percent: risk };
}
