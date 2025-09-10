/**
 * STOP-BANG OSA screening (0–8)
 * S: Snoring, T: Tired, O: Observed apnea, P: high blood Pressure
 * B: BMI>35, A: Age>50, N: Neck>40 cm, G: male Gender
 * Risk: 0–2 low, 3–4 intermediate, 5–8 high
 */
export interface StopBangInput {
  snoring: boolean;
  tired: boolean;
  observed_apnea: boolean;
  high_bp: boolean;
  bmi_gt_35: boolean;
  age_gt_50: boolean;
  neck_cm_gt_40: boolean;
  male: boolean;
}
export interface StopBangResult {
  score: number;
  risk_band: "low" | "intermediate" | "high";
}
export function runSTOPBANG(i: StopBangInput): StopBangResult {
  const score =
    (i.snoring?1:0) + (i.tired?1:0) + (i.observed_apnea?1:0) + (i.high_bp?1:0) +
    (i.bmi_gt_35?1:0) + (i.age_gt_50?1:0) + (i.neck_cm_gt_40?1:0) + (i.male?1:0);
  let risk: StopBangResult["risk_band"] = "low";
  if (score >= 5) risk = "high";
  else if (score >= 3) risk = "intermediate";
  return { score, risk_band: risk };
}
