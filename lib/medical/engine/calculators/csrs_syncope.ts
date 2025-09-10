/**
 * Canadian Syncope Risk Score (CSRS)
 * Sources: AAFP (2021) table; validation literature.
 * Outputs a total score and risk category.
 */

export interface CSRSInput {
  predisposition_to_vasovagal_symptoms?: boolean; // e.g., prolonged standing, warm crowded places, fear/emotion
  history_of_heart_disease?: boolean;
  any_ed_systolic_bp_lt90_or_gt180?: boolean;
  elevated_troponin_over_99pct?: boolean;
  abnormal_qrs_axis?: boolean; // < -30° or > +100°
  qrs_duration_ms_gt130?: boolean;
  qtc_ms_gt480?: boolean;
  ed_diagnosis_vasovagal?: boolean;
  ed_diagnosis_cardiac?: boolean;
}

export interface CSRSOutput {
  score: number;
  category: "Very low" | "Low" | "Medium" | "High" | "Very high";
  details: Record<string, number>;
}

export function runCSRS(i: CSRSInput): CSRSOutput {
  const d: Record<string, number> = {};
  d.predisposition_vvs = i.predisposition_to_vasovagal_symptoms ? -1 : 0;
  d.hx_heart_dz = i.history_of_heart_disease ? 1 : 0;
  d.sbp_extremes = i.any_ed_systolic_bp_lt90_or_gt180 ? 2 : 0;
  d.troponin_high = i.elevated_troponin_over_99pct ? 2 : 0;
  d.axis_abn = i.abnormal_qrs_axis ? 1 : 0;
  d.qrs_wide = i.qrs_duration_ms_gt130 ? 1 : 0;
  d.qtc_long = i.qtc_ms_gt480 ? 2 : 0;
  d.dx_vasovagal = i.ed_diagnosis_vasovagal ? -2 : 0;
  d.dx_cardiac = i.ed_diagnosis_cardiac ? 2 : 0;

  const score = Object.values(d).reduce((a, b) => a + b, 0);

  let category: CSRSOutput["category"];
  if (score <= -3) category = "Very low";
  else if (score <= -1) category = "Low";
  else if (score <= 1) category = "Medium";
  else if (score <= 3) category = "High";
  else category = "Very high";

  return { score, category, details: d };
}
