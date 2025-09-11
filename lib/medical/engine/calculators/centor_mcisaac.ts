// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.


export type McIsaacInputs = {
  age_years: number;
  tonsillar_exudates: boolean;
  tender_anterior_cervical_adenopathy: boolean;
  fever_gt_38c: boolean;
  cough_absent: boolean;
};

export function calc_centor_mcisaac(i: McIsaacInputs): number {
  let s = 0;
  if (i.tonsillar_exudates) s += 1;
  if (i.tender_anterior_cervical_adenopathy) s += 1;
  if (i.fever_gt_38c) s += 1;
  if (i.cough_absent) s += 1;
  // age adjustment
  if (i.age_years >= 3 && i.age_years <= 14) s += 1;
  else if (i.age_years >= 45) s -= 1;
  return s;
}

const def = {
  id: "centor_mcisaac",
  label: "Centor/McIsaac (Strep)",
  inputs: [
    { id: "age_years", label: "Age", type: "number", min: 0, max: 120 },
    { id: "tonsillar_exudates", label: "Tonsillar exudates", type: "boolean" },
    { id: "tender_anterior_cervical_adenopathy", label: "Tender anterior cervical nodes", type: "boolean" },
    { id: "fever_gt_38c", label: "Fever >38°C", type: "boolean" },
    { id: "cough_absent", label: "Cough absent", type: "boolean" }
  ],
  run: (args: McIsaacInputs) => {
    const v = calc_centor_mcisaac(args);
    return { id: "centor_mcisaac", label: "Centor/McIsaac", value: v, unit: "score", precision: 0, notes: [] };
  },
};

export default def;
