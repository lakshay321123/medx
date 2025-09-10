/**
 * Hestia criteria for outpatient management of PE (eligibility screen)
 * If ANY criterion is present -> NOT eligible for outpatient management.
 * Ref: Zondag et al., J Thromb Haemost 2013; and listed on Wikipedia Hestia criteria.
 */
export interface HestiaInput {
  hemodynamic_instability?: boolean; // SBP < 100 mmHg or shock
  need_thrombolysis_or_embolectomy?: boolean;
  active_bleeding_or_high_risk?: boolean;
  oxygen_saturation_lt_90_on_air?: boolean;
  requires_iv_pain_meds?: boolean;
  severe_renal_failure?: boolean; // eGFR < 30 mL/min or CrCl < 30
  severe_liver_failure?: boolean; // e.g., INR > 1.5 not on anticoagulant
  contraindication_to_heparin?: boolean;
  pregnancy?: boolean;
  medical_or_social_reason_for_admission?: boolean; // e.g., uncontrolled pain, poor support, other
  right_ventricular_dysfunction?: boolean; // echo or biomarkers (optional local inclusion)
}
export interface HestiaResult {
  eligible_outpatient: boolean;
  failed_criteria: string[];
}
export function hestiaEligibility(i: HestiaInput): HestiaResult {
  const failed: string[] = [];
  if (i.hemodynamic_instability) failed.push("Hemodynamic instability");
  if (i.need_thrombolysis_or_embolectomy) failed.push("Requires thrombolysis/embolectomy");
  if (i.active_bleeding_or_high_risk) failed.push("Active or high-risk bleeding");
  if (i.oxygen_saturation_lt_90_on_air) failed.push("SpO2 < 90% on room air");
  if (i.requires_iv_pain_meds) failed.push("Requires IV analgesia");
  if (i.severe_renal_failure) failed.push("Severe renal failure (CrCl < 30)");
  if (i.severe_liver_failure) failed.push("Severe liver failure");
  if (i.contraindication_to_heparin) failed.push("Contraindication to heparin");
  if (i.pregnancy) failed.push("Pregnancy");
  if (i.medical_or_social_reason_for_admission) failed.push("Medical/social reason for admission");
  if (i.right_ventricular_dysfunction) failed.push("Right ventricular dysfunction");
  return { eligible_outpatient: failed.length === 0, failed_criteria: failed };
}
