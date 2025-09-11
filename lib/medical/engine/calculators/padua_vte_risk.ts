export type PaduaInputs = {
  active_cancer: boolean; previous_vte: boolean; reduced_mobility: boolean; thrombophilia: boolean;
  recent_trauma_or_surgery: boolean; age_ge_70: boolean; heart_or_respiratory_failure: boolean; acute_mi_or_ischemic_stroke: boolean;
  acute_infection_or_rheumatologic: boolean; bmi_ge_30: boolean; hormonal_treatment: boolean;
};

export function calc_padua_vte_risk(i: PaduaInputs): { score:number; high_risk:boolean } {
  let s = 0;
  s += i.active_cancer ? 3 : 0;
  s += i.previous_vte ? 3 : 0;
  s += i.reduced_mobility ? 3 : 0;
  s += i.thrombophilia ? 3 : 0;
  s += i.recent_trauma_or_surgery ? 2 : 0;
  s += i.age_ge_70 ? 1 : 0;
  s += i.heart_or_respiratory_failure ? 1 : 0;
  s += i.acute_mi_or_ischemic_stroke ? 1 : 0;
  s += i.acute_infection_or_rheumatologic ? 1 : 0;
  s += i.bmi_ge_30 ? 1 : 0;
  s += i.hormonal_treatment ? 1 : 0;
  return { score: s, high_risk: s >= 4 };
}

const def = {
  id: "padua_vte_risk",
  label: "Padua VTE Risk (medical inpatients)",
  inputs: [
    { id: "active_cancer", label: "Active cancer", type: "boolean" },
    { id: "previous_vte", label: "Previous VTE", type: "boolean" },
    { id: "reduced_mobility", label: "Reduced mobility", type: "boolean" },
    { id: "thrombophilia", label: "Known thrombophilia", type: "boolean" },
    { id: "recent_trauma_or_surgery", label: "Recent trauma/surgery (<1 month)", type: "boolean" },
    { id: "age_ge_70", label: "Age ≥70", type: "boolean" },
    { id: "heart_or_respiratory_failure", label: "Heart/respiratory failure", type: "boolean" },
    { id: "acute_mi_or_ischemic_stroke", label: "Acute MI/ischemic stroke", type: "boolean" },
    { id: "acute_infection_or_rheumatologic", label: "Acute infection/rheumatologic disorder", type: "boolean" },
    { id: "bmi_ge_30", label: "BMI ≥30", type: "boolean" },
    { id: "hormonal_treatment", label: "Ongoing hormonal treatment", type: "boolean" }
  ],
  run: (args: PaduaInputs) => {
    const r = calc_padua_vte_risk(args);
    const notes = [r.high_risk ? "High risk (≥4)" : "Low risk"];
    return { id: "padua_vte_risk", label: "Padua VTE", value: r.score, unit: "points", precision: 0, notes, extra: r };
  },
};

export default def;
