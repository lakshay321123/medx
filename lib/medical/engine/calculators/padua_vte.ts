import { register } from "../registry";

/**
 * Padua Prediction Score — VTE risk in medical inpatients
 */
export function calc_padua_vte({
  active_cancer,
  previous_vte,
  reduced_mobility,
  thrombophilia,
  recent_trauma_or_surgery,
  age_ge_70,
  heart_or_respiratory_failure,
  acute_mi_or_stroke,
  acute_infection_or_rheum_dis,
  bmi_ge_30,
  hormonal_treatment,
}: {
  active_cancer?: boolean;
  previous_vte?: boolean;
  reduced_mobility?: boolean;
  thrombophilia?: boolean;
  recent_trauma_or_surgery?: boolean;
  age_ge_70?: boolean;
  heart_or_respiratory_failure?: boolean;
  acute_mi_or_stroke?: boolean;
  acute_infection_or_rheum_dis?: boolean;
  bmi_ge_30?: boolean;
  hormonal_treatment?: boolean;
}) {
  let s = 0;
  if (active_cancer) s += 3;
  if (previous_vte) s += 3;
  if (reduced_mobility) s += 3;
  if (thrombophilia) s += 3;
  if (recent_trauma_or_surgery) s += 2;
  if (age_ge_70) s += 1;
  if (heart_or_respiratory_failure) s += 1;
  if (acute_mi_or_stroke) s += 1;
  if (acute_infection_or_rheum_dis) s += 1;
  if (bmi_ge_30) s += 1;
  if (hormonal_treatment) s += 1;
  return s;
}

register({
  id: "padua_vte",
  label: "Padua Prediction Score (VTE)",
  tags: ["hematology", "risk"],
  inputs: [
    { key: "active_cancer" },
    { key: "previous_vte" },
    { key: "reduced_mobility" },
    { key: "thrombophilia" },
    { key: "recent_trauma_or_surgery" },
    { key: "age_ge_70" },
    { key: "heart_or_respiratory_failure" },
    { key: "acute_mi_or_stroke" },
    { key: "acute_infection_or_rheum_dis" },
    { key: "bmi_ge_30" },
    { key: "hormonal_treatment" }
  ],
  run: (ctx: {
    active_cancer?: boolean;
    previous_vte?: boolean;
    reduced_mobility?: boolean;
    thrombophilia?: boolean;
    recent_trauma_or_surgery?: boolean;
    age_ge_70?: boolean;
    heart_or_respiratory_failure?: boolean;
    acute_mi_or_stroke?: boolean;
    acute_infection_or_rheum_dis?: boolean;
    bmi_ge_30?: boolean;
    hormonal_treatment?: boolean;
  }) => {
    const v = calc_padua_vte(ctx as any);
    const notes = [v >= 4 ? "high VTE risk" : "low VTE risk"];
    return { id: "padua_vte", label: "Padua Prediction Score (VTE)", value: v, unit: "score", precision: 0, notes };
  },
});
