// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

export type PaduaInputs = {
  active_cancer: boolean;
  previous_vte: boolean;
  reduced_mobility: boolean;
  thrombophilia: boolean;
  recent_trauma_or_surgery_le_1mo: boolean;
  age_ge_70: boolean;
  heart_or_respiratory_failure: boolean;
  acute_mi_or_stroke: boolean;
  acute_infection_or_rheum_disorder: boolean;
  bmi_ge_30: boolean;
  ongoing_hormonal_treatment: boolean;
};

export function calc_padua_vte(i: PaduaInputs): { score: number; high_risk: boolean } {
  let s = 0;
  if (i.active_cancer) s += 3;
  if (i.previous_vte) s += 3;
  if (i.reduced_mobility) s += 3;
  if (i.thrombophilia) s += 3;
  if (i.recent_trauma_or_surgery_le_1mo) s += 2;
  if (i.age_ge_70) s += 1;
  if (i.heart_or_respiratory_failure) s += 1;
  if (i.acute_mi_or_stroke) s += 1;
  if (i.acute_infection_or_rheum_disorder) s += 1;
  if (i.bmi_ge_30) s += 1;
  if (i.ongoing_hormonal_treatment) s += 1;
  return { score: s, high_risk: s >= 4 };
}

const def = {
  id: "padua_vte",
  label: "Padua Prediction Score (VTE risk)",
  inputs: [
    { id: "active_cancer", label: "Active cancer", type: "boolean" },
    { id: "previous_vte", label: "Previous VTE", type: "boolean" },
    { id: "reduced_mobility", label: "Reduced mobility", type: "boolean" },
    { id: "thrombophilia", label: "Known thrombophilia", type: "boolean" },
    { id: "recent_trauma_or_surgery_le_1mo", label: "Recent trauma/surgery ≤1 month", type: "boolean" },
    { id: "age_ge_70", label: "Age ≥70", type: "boolean" },
    { id: "heart_or_respiratory_failure", label: "Heart or respiratory failure", type: "boolean" },
    { id: "acute_mi_or_stroke", label: "Acute MI or stroke", type: "boolean" },
    { id: "acute_infection_or_rheum_disorder", label: "Acute infection or rheumatologic disorder", type: "boolean" },
    { id: "bmi_ge_30", label: "BMI ≥30", type: "boolean" },
    { id: "ongoing_hormonal_treatment", label: "Ongoing hormonal treatment", type: "boolean" }
  ],
  run: (args: PaduaInputs) => {
    const r = calc_padua_vte(args);
    const notes = [r.high_risk ? "high risk" : "non-high risk"];
    return { id: "padua_vte", label: "Padua VTE Risk", value: r.score, unit: "points", precision: 0, notes, extra: r };
  },
};

export default def;
