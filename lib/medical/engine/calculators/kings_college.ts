// lib/medical/engine/calculators/kings_college.ts
import { round } from "./utils";

export interface KingsCollegeInput {
  apap_induced: boolean;              // true if acetaminophen etiology
  arterial_pH?: number | null;
  inr?: number | null;
  creatinine_mg_dL?: number | null;
  encephalopathy_grade?: 0|1|2|3|4 | null;

  // Non-APAP adjuncts
  age_years?: number | null;
  etiology_nonA_nonB_or_drug?: boolean | null;
  jaundice_to_encephalopathy_days?: number | null;
  bilirubin_mg_dL?: number | null;
}

export function runKingsCollege(i: KingsCollegeInput) {
  if (i.apap_induced) {
    const pH_crit = (typeof i.arterial_pH === "number" && i.arterial_pH < 7.3);
    const triad = ( (typeof i.inr === "number" && i.inr > 6.5)
      && (typeof i.creatinine_mg_dL === "number" && i.creatinine_mg_dL > 3.4)
      && ((i.encephalopathy_grade ?? 0) >= 3) );
    const meets = !!(pH_crit || triad);
    return { transplant_criteria_met: meets, rule_set: "APAP" as const, pH_crit, triad };
  } else {
    const inr_over_6_5 = (typeof i.inr === "number" && i.inr > 6.5);
    const age_flag = (typeof i.age_years === "number" && (i.age_years < 10 || i.age_years > 40));
    const etiology_flag = !!i.etiology_nonA_nonB_or_drug;
    const jaundice_delay_flag = (typeof i.jaundice_to_encephalopathy_days === "number" && i.jaundice_to_encephalopathy_days > 7);
    const inr_over_3_5 = (typeof i.inr === "number" && i.inr > 3.5);
    const bili_over_17_5 = (typeof i.bilirubin_mg_dL === "number" && i.bilirubin_mg_dL > 17.5);
    const any_three = [age_flag, etiology_flag, jaundice_delay_flag, inr_over_3_5, bili_over_17_5].filter(Boolean).length >= 3;
    const meets = !!(inr_over_6_5 || any_three);
    return { transplant_criteria_met: meets, rule_set: "non-APAP" as const,
      details: { inr_over_6_5, age_flag, etiology_flag, jaundice_delay_flag, inr_over_3_5, bili_over_17_5 } };
  }
}
