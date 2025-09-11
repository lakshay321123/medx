// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.

// Simplified Revised Geneva Score (PE)
export type GenevaInputs = {
  age_years: number;
  previous_dvt_pe: boolean;
  surgery_fracture_recent: boolean;
  active_malignancy: boolean;
  unilateral_leg_pain: boolean;
  hemoptysis: boolean;
  heart_rate_bpm: number;
  pain_on_deep_palpation_unilateral_edema: boolean;
};

export function calc_geneva_simplified(args: GenevaInputs): number {
  let score = 0;
  if (args.age_years > 65) score += 1;
  if (args.previous_dvt_pe) score += 1;
  if (args.surgery_fracture_recent) score += 1;
  if (args.active_malignancy) score += 1;
  if (args.unilateral_leg_pain) score += 1;
  if (args.hemoptysis) score += 1;
  if (args.heart_rate_bpm >= 75 && args.heart_rate_bpm <= 94) score += 1;
  else if (args.heart_rate_bpm >= 95) score += 2;
  if (args.pain_on_deep_palpation_unilateral_edema) score += 1;
  return score;
}

const def = {
  id: "revised_geneva_pe",
  label: "Revised Geneva (simplified, PE)",
  inputs: [
    { id: "age_years", label: "Age", type: "number", min: 0, max: 120 },
    { id: "previous_dvt_pe", label: "Previous DVT/PE", type: "boolean" },
    { id: "surgery_fracture_recent", label: "Surgery or fracture <1 mo", type: "boolean" },
    { id: "active_malignancy", label: "Active malignancy", type: "boolean" },
    { id: "unilateral_leg_pain", label: "Unilateral leg pain", type: "boolean" },
    { id: "hemoptysis", label: "Hemoptysis", type: "boolean" },
    { id: "heart_rate_bpm", label: "Heart rate (bpm)", type: "number", min: 0 },
    { id: "pain_on_deep_palpation_unilateral_edema", label: "Pain on deep palpation + unilateral edema", type: "boolean" }
  ],
  run: (args: GenevaInputs) => {
    const v = calc_geneva_simplified(args);
    return { id: "revised_geneva_pe", label: "Revised Geneva (simplified)", value: v, unit: "score", precision: 0, notes: [] };
  },
};

export default def;
