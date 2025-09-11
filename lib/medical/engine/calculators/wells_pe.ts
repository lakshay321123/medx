// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

export type WellsPEInputs = {
  signs_dvt: boolean; // clinical signs of DVT
  alt_dx_less_likely: boolean; // PE more likely than alternative
  hr_gt_100: boolean;
  immobilization_surgery: boolean;
  prior_dvt_pe: boolean;
  hemoptysis: boolean;
  active_cancer: boolean;
};

export function calc_wells_pe(i: WellsPEInputs): number {
  let s = 0;
  if (i.signs_dvt) s += 3;
  if (i.alt_dx_less_likely) s += 3;
  if (i.hr_gt_100) s += 1.5;
  if (i.immobilization_surgery) s += 1.5;
  if (i.prior_dvt_pe) s += 1.5;
  if (i.hemoptysis) s += 1;
  if (i.active_cancer) s += 1;
  return s;
}

const def = {
  id: "wells_pe",
  label: "Wells Score (PE)",
  inputs: [
    { id: "signs_dvt", label: "Clinical signs of DVT", type: "boolean" },
    { id: "alt_dx_less_likely", label: "PE more likely than alternative", type: "boolean" },
    { id: "hr_gt_100", label: "Heart rate >100", type: "boolean" },
    { id: "immobilization_surgery", label: "Immobilization/surgery recent", type: "boolean" },
    { id: "prior_dvt_pe", label: "Prior DVT/PE", type: "boolean" },
    { id: "hemoptysis", label: "Hemoptysis", type: "boolean" },
    { id: "active_cancer", label: "Active cancer", type: "boolean" }
  ],
  run: (args: WellsPEInputs) => {
    const v = calc_wells_pe(args);
    return { id: "wells_pe", label: "Wells (PE)", value: v, unit: "points", precision: 1, notes: [] };
  },
};

export default def;
