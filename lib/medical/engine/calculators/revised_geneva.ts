export type RevisedGenevaInputs = {
  age_gt_65: boolean;
  previous_dvt_pe: boolean;
  surgery_or_fracture_last_month: boolean;
  active_malignancy: boolean;
  unilateral_lower_limb_pain: boolean;
  hemoptysis: boolean;
  hr_bpm: number; // 75-94 => 3; >=95 => 5
  pain_on_palpaption_edema: boolean;
};

export function calc_revised_geneva(i: RevisedGenevaInputs): { score:number; risk:"low"|"intermediate"|"high" } {
  let s = 0;
  s += i.age_gt_65 ? 1 : 0;
  s += i.previous_dvt_pe ? 3 : 0;
  s += i.surgery_or_fracture_last_month ? 2 : 0;
  s += i.active_malignancy ? 2 : 0;
  s += i.unilateral_lower_limb_pain ? 3 : 0;
  s += i.hemoptysis ? 2 : 0;
  s += i.hr_bpm >= 95 ? 5 : (i.hr_bpm >= 75 ? 3 : 0);
  s += i.pain_on_palpaption_edema ? 4 : 0;
  let risk:"low"|"intermediate"|"high" = "low";
  if (s >= 11) risk = "high";
  else if (s >= 4) risk = "intermediate";
  return { score: s, risk };
}

const def = {
  id: "revised_geneva",
  label: "Revised Geneva Score (PE)",
  inputs: [
    { id: "age_gt_65", label: "Age >65", type: "boolean" },
    { id: "previous_dvt_pe", label: "Previous DVT/PE", type: "boolean" },
    { id: "surgery_or_fracture_last_month", label: "Surgery/fracture <1 month", type: "boolean" },
    { id: "active_malignancy", label: "Active malignancy", type: "boolean" },
    { id: "unilateral_lower_limb_pain", label: "Unilateral lower limb pain", type: "boolean" },
    { id: "hemoptysis", label: "Hemoptysis", type: "boolean" },
    { id: "hr_bpm", label: "Heart rate (bpm)", type: "number", min: 0 },
    { id: "pain_on_palpaption_edema", label: "Pain on deep venous palpation and unilateral edema", type: "boolean" }
  ],
  run: (args: RevisedGenevaInputs) => {
    const r = calc_revised_geneva(args);
    const notes = [r.risk];
    return { id: "revised_geneva", label: "Revised Geneva", value: r.score, unit: "points", precision: 0, notes, extra: r };
  },
};

export default def;
