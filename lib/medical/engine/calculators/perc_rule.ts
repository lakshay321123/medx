run: ({
  age_years,
  heart_rate,
  spo2_percent,
  hemoptysis,
  estrogen_use,
  prior_dvt_pe,
  unilateral_leg_swelling,
  recent_surgery_trauma,
}: {
  age_years?: number;
  heart_rate?: number;
  spo2_percent?: number;
  hemoptysis?: boolean;
  estrogen_use?: boolean;
  prior_dvt_pe?: boolean;
  unilateral_leg_swelling?: boolean;
  recent_surgery_trauma?: boolean;
}) => {
  const v = calc_perc({
    age_years,
    heart_rate,
    spo2_percent,
    hemoptysis,
    estrogen_use,
    prior_dvt_pe,
    unilateral_leg_swelling,
    recent_surgery_trauma,
  });
  const notes = [v === 0 ? "PERC negative (if low pretest)" : "PERC positive"];
  return { id: "perc_rule", label: "PERC Rule (PE)", value: v, unit: "criteria", precision: 0, notes };
},
