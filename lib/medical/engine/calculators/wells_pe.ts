// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.


export type WellsPEInputs = {
  signs_dvt: boolean;
  pe_more_likely_than_alt: boolean;
  heart_rate_gt_100: boolean;
  immob_surgery_4w: boolean;
  previous_dvt_pe: boolean;
  hemoptysis: boolean;
  malignancy: boolean;
};

export function calc_wells_pe(i: WellsPEInputs): number {
  let s = 0;
  if (i.signs_dvt) s += 3;
  if (i.pe_more_likely_than_alt) s += 3;
  if (i.heart_rate_gt_100) s += 1.5;
  if (i.immob_surgery_4w) s += 1.5;
  if (i.previous_dvt_pe) s += 1.5;
  if (i.hemoptysis) s += 1;
  if (i.malignancy) s += 1;
  return s;
}

const def = {
  id: "wells_pe",
  label: "Wells Score (PE)",
  inputs: [
    { id: "signs_dvt", label: "Clinical signs of DVT", type: "boolean" },
    { id: "pe_more_likely_than_alt", label: "PE more likely than alternative", type: "boolean" },
    { id: "heart_rate_gt_100", label: "Heart rate >100", type: "boolean" },
    { id: "immob_surgery_4w", label: "Immob./surgery <4 weeks", type: "boolean" },
    { id: "previous_dvt_pe", label: "Previous DVT/PE", type: "boolean" },
    { id: "hemoptysis", label: "Hemoptysis", type: "boolean" },
    { id: "malignancy", label: "Malignancy", type: "boolean" }
  ],
  run: (args: WellsPEInputs) => {
    const v = calc_wells_pe(args);
    return { id: "wells_pe", label: "Wells (PE)", value: v, unit: "score", precision: 1, notes: [] };
  },
};

export default def;
