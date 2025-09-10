run: ({
  dvt_signs,
  pe_most_likely,
  heart_rate,
  recent_surgery_or_immobilization,
  prior_dvt_pe,
  hemoptysis,
  malignancy,
}: {
  dvt_signs?: boolean;
  pe_most_likely?: boolean;
  heart_rate?: number;
  recent_surgery_or_immobilization?: boolean;
  prior_dvt_pe?: boolean;
  hemoptysis?: boolean;
  malignancy?: boolean;
}) => {
  const v = calc_wells_pe({
    dvt_signs,
    pe_most_likely,
    heart_rate,
    recent_surgery_or_immobilization,
    prior_dvt_pe,
    hemoptysis,
    malignancy,
  });
  const notes = [v > 6 ? "high pretest probability" : v >= 2 ? "moderate pretest probability" : "low pretest probability"];
  return { id: "wells_pe", label: "Wells Score (PE)", value: v, unit: "score", precision: 1, notes };
},
