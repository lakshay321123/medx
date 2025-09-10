/**
 * Apfel PONV risk (0–4)
 * Female, non-smoker, history of PONV or motion sickness, postoperative opioids
 */
export interface ApfelInput {
  female: boolean;
  non_smoker: boolean;
  history_ponv_or_motion: boolean;
  postop_opioids: boolean;
}
export interface ApfelResult { score: number; }
export function runApfelPONV(i: ApfelInput): ApfelResult {
  const s = [i.female, i.non_smoker, i.history_ponv_or_motion, i.postop_opioids].filter(Boolean).length;
  return { score: s };
}
