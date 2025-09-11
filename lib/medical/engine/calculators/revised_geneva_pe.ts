// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

export type RevisedGenevaInputs = {
  age_gt_65: boolean;
  prior_dvt_pe: boolean;
  surgery_fracture_le_1mo: boolean;
  active_malignancy: boolean;
  unilateral_lower_limb_pain: boolean;
  hemoptysis: boolean;
  hr_bpm: number;
  pain_on_deep_vein_palpation_and_unilateral_edema: boolean;
};

export function calc_revised_geneva_pe(i: RevisedGenevaInputs): { score: number; risk: "low"|"intermediate"|"high" } {
  let s = 0;
  if (i.age_gt_65) s += 1;
  if (i.prior_dvt_pe) s += 3;
  if (i.surgery_fracture_le_1mo) s += 2;
  if (i.active_malignancy) s += 2;
  if (i.unilateral_lower_limb_pain) s += 3;
  if (i.hemoptysis) s += 2;
  if (i.hr_bpm >= 95) s += 5;
  else if (i.hr_bpm >= 75) s += 3;
  if (i.pain_on_deep_vein_palpation_and_unilateral_edema) s += 4;
  let risk: "low"|"intermediate"|"high" = "low";
  if (s >= 11) risk = "high";
  else if (s >= 4) risk = "intermediate";
  return { score: s, risk };
}

const def = {
  id: "revised_geneva_pe",
  label: "Revised Geneva Score (PE)",
  inputs: [
    { id: "age_gt_65", label: "Age >65", type: "boolean" },
    { id: "prior_dvt_pe", label: "Previous DVT/PE", type: "boolean" },
    { id: "surgery_fracture_le_1mo", label: "Surgery or fracture ≤1 month", type: "boolean" },
    { id: "active_malignancy", label: "Active malignancy", type: "boolean" },
    { id: "unilateral_lower_limb_pain", label: "Unilateral lower limb pain", type: "boolean" },
    { id: "hemoptysis", label: "Hemoptysis", type: "boolean" },
    { id: "hr_bpm", label: "Heart rate (bpm)", type: "number", min: 0 },
    { id: "pain_on_deep_vein_palpation_and_unilateral_edema", label: "Pain on deep venous palpation AND unilateral edema", type: "boolean" }
  ],
  run: (args: RevisedGenevaInputs) => {
    const r = calc_revised_geneva_pe(args);
    const notes = [r.risk];
    return { id: "revised_geneva_pe", label: "Revised Geneva (PE)", value: r.score, unit: "points", precision: 0, notes, extra: r };
  },
};

export default def;
