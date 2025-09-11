export type WellsPEInputs = {
  clinical_signs_dvt: boolean;
  pe_more_likely_than_alt: boolean;
  hr_gt_100: boolean;
  immobilization_or_surgery_4w: boolean;
  prior_dvt_pe: boolean;
  hemoptysis: boolean;
  active_cancer: boolean;
};

export function calc_wells_pe(i: WellsPEInputs): { score: number; category: "low"|"moderate"|"high" } {
  let s = 0;
  if (i.clinical_signs_dvt) s += 3;
  if (i.pe_more_likely_than_alt) s += 3;
  if (i.hr_gt_100) s += 1.5;
  if (i.immobilization_or_surgery_4w) s += 1.5;
  if (i.prior_dvt_pe) s += 1.5;
  if (i.hemoptysis) s += 1;
  if (i.active_cancer) s += 1;
  let category: "low"|"moderate"|"high" = "low";
  if (s > 6) category = "high";
  else if (s >= 2) category = "moderate";
  return { score: s, category };
}

const def = {
  id: "wells_pe",
  label: "Wells Score (Pulmonary Embolism)",
  inputs: [
    { id: "clinical_signs_dvt", label: "Clinical signs of DVT", type: "boolean" },
    { id: "pe_more_likely_than_alt", label: "PE more likely than alternative", type: "boolean" },
    { id: "hr_gt_100", label: "Heart rate >100", type: "boolean" },
    { id: "immobilization_or_surgery_4w", label: "Immobilization or surgery in past 4 weeks", type: "boolean" },
    { id: "prior_dvt_pe", label: "Prior DVT/PE", type: "boolean" },
    { id: "hemoptysis", label: "Hemoptysis", type: "boolean" },
    { id: "active_cancer", label: "Active cancer", type: "boolean" }
  ],
  run: (args: WellsPEInputs) => {
    const r = calc_wells_pe(args);
    const notes = [r.category];
    return { id: "wells_pe", label: "Wells PE", value: r.score, unit: "points", precision: 1, notes, extra: r };
  },
};

export default def;
