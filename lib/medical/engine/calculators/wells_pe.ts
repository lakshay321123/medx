import { register } from "../registry";

/**
 * Wells Score for Pulmonary Embolism
 */
export function calc_wells_pe({
  dvt_signs, pe_most_likely, heart_rate, recent_surgery_or_immobilization, prior_dvt_pe, hemoptysis, malignancy
}: {
  dvt_signs?: boolean,
  pe_most_likely?: boolean,
  heart_rate?: number,
  recent_surgery_or_immobilization?: boolean,
  prior_dvt_pe?: boolean,
  hemoptysis?: boolean,
  malignancy?: boolean
}) {
  let s = 0;
  if (dvt_signs) s += 3;
  if (pe_most_likely) s += 3;
  if ((heart_rate ?? 0) > 100) s += 1.5;
  if (recent_surgery_or_immobilization) s += 1.5;
  if (prior_dvt_pe) s += 1.5;
  if (hemoptysis) s += 1;
  if (malignancy) s += 1;
  return s;
}

register({
  id: "wells_pe",
  label: "Wells Score (PE)",
  tags: ["pulmonology", "emergency"],
  inputs: [
    { key: "dvt_signs" },
    { key: "pe_most_likely" },
    { key: "heart_rate" },
    { key: "recent_surgery_or_immobilization" },
    { key: "prior_dvt_pe" },
    { key: "hemoptysis" },
    { key: "malignancy" }
  ],
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
});
