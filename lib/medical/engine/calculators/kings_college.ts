export interface KCInput {
  acetaminophen_related: boolean;
  arterial_pH?: number;
  lactate_mmol_L?: number;
  inr?: number;
  creat_mg_dL?: number;
  encephalopathy_grade?: 0|1|2|3|4;
  hepatic_etiology_detail?: string;
}

export function kingsCollegeTransplantCriteria(i: KCInput) {
  if (i.acetaminophen_related) {
    const pH_crit = i.arterial_pH !== undefined && i.arterial_pH < 7.30;
    const triad = (i.inr !== undefined && i.inr > 6.5) && (i.creat_mg_dL !== undefined && i.creat_mg_dL > 3.4) && ((i.encephalopathy_grade ?? 0) >= 3);
    const lactateCrit = i.lactate_mmol_L !== undefined && i.lactate_mmol_L > 3.5;
    const meet = pH_crit || triad || lactateCrit;
    return { meets_criteria: meet, pathway: "acetaminophen", details: { pH_crit, triad, lactateCrit } };
  } else {
    const pH_crit = i.arterial_pH !== undefined && i.arterial_pH < 7.30;
    const combined = (i.inr !== undefined && i.inr > 6.5) && (i.creat_mg_dL !== undefined && i.creat_mg_dL > 3.4) && ((i.encephalopathy_grade ?? 0) >= 3);
    const meet = pH_crit || combined;
    return { meets_criteria: meet, pathway: "non-acetaminophen", details: { pH_crit, combined } };
  }
}
