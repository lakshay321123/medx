
// lib/medical/engine/calculators/kings_college.ts
// King's College criteria for ALF transplant referral decision support (simplified logic).

export interface KCCInput {
  acetaminophen_induced: boolean;
  arterial_pH_12h_post_resusc?: number; // optional
  inr: number;
  creatinine_mg_dL: number;
  encephalopathy_grade: 0|1|2|3|4;
  // Non-APAP variables
  age_years?: number;
  jaundice_to_encephalopathy_days?: number;
  etiology_unfavorable?: boolean; // e.g., drug reaction, non-A non-B hepatitis, halothane, idiosyncratic
  bilirubin_mg_dL?: number;
}

export interface KCCOutput {
  meets_criteria: boolean;
  pathway: "APAP" | "non-APAP";
  reasons: string[];
}

export function kingsCollege(i: KCCInput): KCCOutput {
  const reasons: string[] = [];
  if (i.acetaminophen_induced) {
    // APAP pathway
    if (typeof i.arterial_pH_12h_post_resusc === "number" && i.arterial_pH_12h_post_resusc < 7.3) {
      reasons.push("APAP: arterial pH < 7.3");
      return { meets_criteria: true, pathway: "APAP", reasons };
    }
    if (i.inr > 6.5 && i.creatinine_mg_dL > 3.4 && i.encephalopathy_grade >= 3) {
      reasons.push("APAP: INR > 6.5, Cr > 3.4, and grade III/IV encephalopathy");
      return { meets_criteria: true, pathway: "APAP", reasons };
    }
    return { meets_criteria: false, pathway: "APAP", reasons };
  } else {
    // non-APAP pathway
    if (i.inr > 6.5) {
      reasons.push("Non-APAP: INR > 6.5");
      return { meets_criteria: true, pathway: "non-APAP", reasons };
    }
    let count = 0;
    if (typeof i.age_years === "number" && (i.age_years < 10 || i.age_years > 40)) { count++; reasons.push("Age <10 or >40"); }
    if (i.etiology_unfavorable) { count++; reasons.push("Unfavorable etiology"); }
    if (typeof i.jaundice_to_encephalopathy_days === "number" && i.jaundice_to_encephalopathy_days > 7) { count++; reasons.push("Jaundice >7 days before encephalopathy"); }
    if (i.inr > 3.5) { count++; reasons.push("INR > 3.5"); }
    if (typeof i.bilirubin_mg_dL === "number" && i.bilirubin_mg_dL > 17.5) { count++; reasons.push("Bilirubin > 17.5 mg/dL"); }
    const meets = count >= 3;
    if (meets) reasons.unshift("Non-APAP: ≥3 criteria met");
    return { meets_criteria: meets, pathway: "non-APAP", reasons };
  }
}
