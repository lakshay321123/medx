/**
 * qSOFA (0 to 3)
 * RR >= 22, SBP <= 100, Altered mental status (GCS < 15)
 * Positive screen if score >= 2
 */
export interface qSOFAInput {
  rr_per_min: number;
  sbp_mmHg: number;
  gcs: number;
}
export interface qSOFAResult { score: number; positive: boolean; }
export function runqSOFA(i: qSOFAInput): qSOFAResult {
  let s = 0;
  if (i.rr_per_min >= 22) s += 1;
  if (i.sbp_mmHg <= 100) s += 1;
  if (i.gcs < 15) s += 1;
  return { score: s, positive: s >= 2 };
}
