// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

export type SimplifiedGenevaInputs = {
  age_gt_65: boolean;
  prior_dvt_pe: boolean;
  surgery_fracture_le_1mo: boolean;
  active_malignancy: boolean;
  unilateral_lower_limb_pain: boolean;
  hemoptysis: boolean;
  hr_gt_75: boolean;
  pain_on_deep_vein_palpation_and_unilateral_edema: boolean;
};

export function calc_simplified_geneva_pe(i: SimplifiedGenevaInputs): { score: number; risk: "low"|"intermediate"|"high" } {
  let s = 0;
  for (const v of [
    i.age_gt_65, i.prior_dvt_pe, i.surgery_fracture_le_1mo, i.active_malignancy,
    i.unilateral_lower_limb_pain, i.hemoptysis, i.hr_gt_75,
    i.pain_on_deep_vein_palpation_and_unilateral_edema
  ]) { if (v) s += 1; }
  let risk: "low"|"intermediate"|"high" = "low";
  if (s >= 5) risk = "high";
  else if (s >= 2) risk = "intermediate";
  return { score: s, risk };
}

const def = {
  id: "simplified_geneva_pe",
  label: "Simplified Geneva Score (PE)",
  inputs: [
    { id: "age_gt_65", label: "Age >65", type: "boolean" },
    { id: "prior_dvt_pe", label: "Previous DVT/PE", type: "boolean" },
    { id: "surgery_fracture_le_1mo", label: "Surgery or fracture ≤1 month", type: "boolean" },
    { id: "active_malignancy", label: "Active malignancy", type: "boolean" },
    { id: "unilateral_lower_limb_pain", label: "Unilateral lower limb pain", type: "boolean" },
    { id: "hemoptysis", label: "Hemoptysis", type: "boolean" },
    { id: "hr_gt_75", label: "Heart rate >75 bpm", type: "boolean" },
    { id: "pain_on_deep_vein_palpation_and_unilateral_edema", label: "Pain on deep venous palpation AND unilateral edema", type: "boolean" }
  ],
  run: (args: SimplifiedGenevaInputs) => {
    const r = calc_simplified_geneva_pe(args);
    const notes = [r.risk];
    return { id: "simplified_geneva_pe", label: "Simplified Geneva (PE)", value: r.score, unit: "points", precision: 0, notes, extra: r };
  },
};

export default def;
