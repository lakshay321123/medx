// lib/medical/engine/calculators/hestia.ts
// Hestia criteria for outpatient PE treatment eligibility.
// Returns eligible flag and list of failed criteria.

export interface HestiaInput {
  hemodynamic_instability?: boolean | null;
  thrombolysis_or_embolectomy_needed?: boolean | null;
  active_bleeding_or_high_risk?: boolean | null;
  oxygen_saturation_lt_90?: boolean | null;
  severe_renal_or_hepatic_failure?: boolean | null;
  pregnancy?: boolean | null;
  pe_as_diagnosis_in_context_of_other_serious_condition?: boolean | null;
  social_issues_prevent_outpatient?: boolean | null;
}

export interface HestiaOutput {
  eligible_outpatient: boolean;
  failed_criteria: string[];
}

export function runHestia(i: HestiaInput): HestiaOutput {
  const failures: string[] = [];
  if (i.hemodynamic_instability) failures.push("hemodynamic_instability");
  if (i.thrombolysis_or_embolectomy_needed) failures.push("advanced_therapy_required");
  if (i.active_bleeding_or_high_risk) failures.push("bleeding_risk");
  if (i.oxygen_saturation_lt_90) failures.push("hypoxemia");
  if (i.severe_renal_or_hepatic_failure) failures.push("organ_failure");
  if (i.pregnancy) failures.push("pregnancy");
  if (i.pe_as_diagnosis_in_context_of_other_serious_condition) failures.push("serious_comorbidity");
  if (i.social_issues_prevent_outpatient) failures.push("social_issues");
  return { eligible_outpatient: failures.length === 0, failed_criteria: failures };
}
