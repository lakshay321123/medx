/**
 * Harmless Acute Pancreatitis Score (HAPS)
 * Score items that predict a harmless course when all are favorable:
 * - No rebound tenderness or guarding
 * - Hematocrit normal: female <= 39, male <= 43 percent
 * - Serum creatinine <= 2.0 mg/dL
 * If all favorable then HAPS is 0 and likely non severe
 */
export interface HAPSInput {
  sex: "male" | "female";
  rebound_or_guarding_present: boolean;
  hematocrit_percent: number;
  creatinine_mg_dl: number;
}
export interface HAPSResult { haps_score: number; favorable: boolean; }
export function runHAPS(i: HAPSInput): HAPSResult {
  let s = 0;
  if (i.rebound_or_guarding_present) s += 1;
  const hct_ok = i.sex === "male" ? (i.hematocrit_percent <= 43) : (i.hematocrit_percent <= 39);
  if (!hct_ok) s += 1;
  if (i.creatinine_mg_dl > 2.0) s += 1;
  return { haps_score: s, favorable: s === 0 };
}
