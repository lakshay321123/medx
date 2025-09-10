
// lib/medical/engine/calculators/padua_vte.ts
// Padua Prediction Score for VTE risk in medical inpatients (high risk if ≥4).

export interface PaduaInput {
  active_cancer: boolean;                        // 3
  previous_vte: boolean;                         // 3
  reduced_mobility: boolean;                     // 3
  known_thrombophilic_condition: boolean;        // 3
  recent_trauma_or_surgery_1month: boolean;     // 2
  elderly_age_ge_70: boolean;                    // 1
  heart_or_respiratory_failure: boolean;         // 1
  acute_mi_or_ischemic_stroke: boolean;         // 1
  acute_infection_or_rheumatologic_disorder: boolean; // 1
  bmi_ge_30: boolean;                            // 1
  ongoing_hormonal_treatment: boolean;           // 1
}

export interface PaduaOutput {
  points: number;
  high_risk: boolean;
  components: Record<string, number>;
}

export function runPadua(i: PaduaInput): PaduaOutput {
  const comp: Record<string, number> = {};
  comp.active_cancer = i.active_cancer ? 3 : 0;
  comp.previous_vte = i.previous_vte ? 3 : 0;
  comp.reduced_mobility = i.reduced_mobility ? 3 : 0;
  comp.known_thrombophilia = i.known_thrombophilic_condition ? 3 : 0;
  comp.recent_trauma_or_surgery_1month = i.recent_trauma_or_surgery_1month ? 2 : 0;
  comp.elderly_age_ge_70 = i.elderly_age_ge_70 ? 1 : 0;
  comp.heart_or_respiratory_failure = i.heart_or_respiratory_failure ? 1 : 0;
  comp.acute_mi_or_ischemic_stroke = i.acute_mi_or_ischemic_stroke ? 1 : 0;
  comp.acute_infection_or_rheumatologic_disorder = i.acute_infection_or_rheumatologic_disorder ? 1 : 0;
  comp.bmi_ge_30 = i.bmi_ge_30 ? 1 : 0;
  comp.ongoing_hormonal_treatment = i.ongoing_hormonal_treatment ? 1 : 0;

  const total = Object.values(comp).reduce((a,b)=>a+b,0);
  return { points: total, high_risk: total >= 4, components: comp };
}
