/**
 * Revised Cardiac Risk Index (RCRI)
 * Predictors (1 point each):
 * - High-risk surgery (intraperitoneal, intrathoracic, suprainguinal vascular)
 * - History of ischemic heart disease
 * - History of heart failure
 * - History of cerebrovascular disease
 * - Pre-op insulin treatment for diabetes
 * - Creatinine > 2.0 mg/dL
 */
export interface RCRIInput {
  high_risk_surgery: boolean;
  ischemic_hd: boolean;
  heart_failure: boolean;
  cerebrovascular: boolean;
  insulin_treated_dm: boolean;
  creatinine_mg_dl: number;
}
export interface RCRIResult {
  points: number;
  risk_band: "low" | "intermediate" | "high";
}
export function runRCRI(i: RCRIInput): RCRIResult {
  let points = 0;
  if (i.high_risk_surgery) points++;
  if (i.ischemic_hd) points++;
  if (i.heart_failure) points++;
  if (i.cerebrovascular) points++;
  if (i.insulin_treated_dm) points++;
  if (i.creatinine_mg_dl != null && i.creatinine_mg_dl > 2.0) points++;

  let risk: RCRIResult["risk_band"];
  if (points === 0) risk = "low";
  else if (points === 1) risk = "intermediate";
  else risk = "high";

  return { points, risk_band: risk };
}
