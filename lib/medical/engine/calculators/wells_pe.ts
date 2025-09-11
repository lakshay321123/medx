export type WellsPEInputs = {
  clinical_signs_dvt: boolean;
  pe_most_likely: boolean;
  hr_gt_100: boolean;
  immobilization_or_surgery: boolean;
  previous_dvt_pe: boolean;
  hemoptysis: boolean;
  malignancy: boolean;
};

export function calc_wells_pe(i: WellsPEInputs): { score: number; risk: "low"|"moderate"|"high" } {
  let s = 0;
  if (i.clinical_signs_dvt) s += 3;
  if (i.pe_most_likely) s += 3;
  if (i.hr_gt_100) s += 1.5;
  if (i.immobilization_or_surgery) s += 1.5;
  if (i.previous_dvt_pe) s += 1.5;
  if (i.hemoptysis) s += 1;
  if (i.malignancy) s += 1;
  let risk: "low"|"moderate"|"high" = "low";
  if (s > 6) risk = "high";
  else if (s > 2) risk = "moderate";
  return { score: s, risk };
}

const def = {
  id: "wells_pe",
  label: "Wells Score (PE)",
  inputs: [
    { id: "clinical_signs_dvt", label: "Clinical signs of DVT", type: "boolean" },
    { id: "pe_most_likely", label: "PE more likely than alternative", type: "boolean" },
    { id: "hr_gt_100", label: "HR >100", type: "boolean" },
    { id: "immobilization_or_surgery", label: "Immobilization ≥3 days or surgery <4 w", type: "boolean" },
    { id: "previous_dvt_pe", label: "Previous DVT/PE", type: "boolean" },
    { id: "hemoptysis", label: "Hemoptysis", type: "boolean" },
    { id: "malignancy", label: "Active malignancy", type: "boolean" }
  ],
  run: (args: WellsPEInputs) => {
    const r = calc_wells_pe(args);
    const notes = [r.risk];
    return { id: "wells_pe", label: "Wells (PE)", value: r.score, unit: "points", precision: 1, notes, extra: r };
  },
};

export default def;
