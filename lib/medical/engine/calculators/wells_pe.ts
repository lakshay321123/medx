export type WellsPEInputs = {
  clinical_signs_dvt: boolean;             // 3.0
  pe_more_likely_than_alt: boolean;        // 3.0
  hr_gt_100: boolean;                      // 1.5
  immobilization_or_surgery_4w: boolean;   // 1.5
  previous_dvt_pe: boolean;                // 1.5
  hemoptysis: boolean;                     // 1.0
  malignancy: boolean;                     // 1.0
};

export function calc_wells_pe(i: WellsPEInputs): { score:number; risk:"likely"|"unlikely" } {
  let s = 0;
  s += i.clinical_signs_dvt ? 3 : 0;
  s += i.pe_more_likely_than_alt ? 3 : 0;
  s += i.hr_gt_100 ? 1.5 : 0;
  s += i.immobilization_or_surgery_4w ? 1.5 : 0;
  s += i.previous_dvt_pe ? 1.5 : 0;
  s += i.hemoptysis ? 1 : 0;
  s += i.malignancy ? 1 : 0;
  const risk = s > 4 ? "likely" : "unlikely";
  return { score: s, risk };
}

const def = {
  id: "wells_pe",
  label: "Wells Score (PE)",
  inputs: [
    { id: "clinical_signs_dvt", label: "Clinical signs of DVT", type: "boolean" },
    { id: "pe_more_likely_than_alt", label: "PE more likely than alternative", type: "boolean" },
    { id: "hr_gt_100", label: "Heart rate >100", type: "boolean" },
    { id: "immobilization_or_surgery_4w", label: "Immobilization/surgery in past 4 weeks", type: "boolean" },
    { id: "previous_dvt_pe", label: "Previous DVT/PE", type: "boolean" },
    { id: "hemoptysis", label: "Hemoptysis", type: "boolean" },
    { id: "malignancy", label: "Active malignancy", type: "boolean" }
  ],
  run: (args: WellsPEInputs) => {
    const r = calc_wells_pe(args);
    const notes = [r.risk === "likely" ? "PE likely (>4)" : "PE unlikely (≤4)"];
    return { id: "wells_pe", label: "Wells (PE)", value: r.score, unit: "points", precision: 1, notes, extra: r };
  },
};

export default def;
