// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

export type CentorInputs = {
  age_years: number;
  tonsillar_exudates: boolean;
  tender_anterior_cervical_nodes: boolean;
  fever_ge_38c: boolean;
  absence_of_cough: boolean;
};

export function calc_centor_mcisaac(i: CentorInputs): number {
  let s = 0;
  if (i.tonsillar_exudates) s += 1;
  if (i.tender_anterior_cervical_nodes) s += 1;
  if (i.fever_ge_38c) s += 1;
  if (i.absence_of_cough) s += 1;
  if (i.age_years <= 14) s += 1;
  else if (i.age_years >= 45) s -= 1;
  return s;
}

const def = {
  id: "centor_mcisaac",
  label: "Centor/McIsaac (strep)",
  inputs: [
    { id: "age_years", label: "Age (years)", type: "number", min: 0, max: 120 },
    { id: "tonsillar_exudates", label: "Tonsillar exudates", type: "boolean" },
    { id: "tender_anterior_cervical_nodes", label: "Tender anterior cervical nodes", type: "boolean" },
    { id: "fever_ge_38c", label: "Fever ≥38°C", type: "boolean" },
    { id: "absence_of_cough", label: "Absence of cough", type: "boolean" }
  ],
  run: (args: CentorInputs) => {
    const v = calc_centor_mcisaac(args);
    return { id: "centor_mcisaac", label: "Centor/McIsaac", value: v, unit: "score", precision: 0, notes: [] };
  },
};

export default def;
