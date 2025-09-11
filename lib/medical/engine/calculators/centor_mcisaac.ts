export type McIsaacInputs = {
  age_years: number;
  tonsillar_exudates: boolean;
  tender_anterior_cervical_nodes: boolean;
  fever_by_history: boolean;
  cough_absent: boolean;
};

export function calc_centor_mcisaac(i: McIsaacInputs): number {
  let s = 0;
  if (i.tonsillar_exudates) s += 1;
  if (i.tender_anterior_cervical_nodes) s += 1;
  if (i.fever_by_history) s += 1;
  if (i.cough_absent) s += 1;
  if (i.age_years < 15) s += 1;
  else if (i.age_years >= 45) s -= 1;
  return s;
}

const def = {
  id: "centor_mcisaac",
  label: "Centor/McIsaac (strep pharyngitis)",
  inputs: [
    { id: "age_years", label: "Age (years)", type: "number", min: 0, max: 120 },
    { id: "tonsillar_exudates", label: "Tonsillar exudates", type: "boolean" },
    { id: "tender_anterior_cervical_nodes", label: "Tender anterior cervical nodes", type: "boolean" },
    { id: "fever_by_history", label: "Fever by history", type: "boolean" },
    { id: "cough_absent", label: "Cough absent", type: "boolean" }
  ],
  run: (args: McIsaacInputs) => {
    const v = calc_centor_mcisaac(args);
    return { id: "centor_mcisaac", label: "Centor/McIsaac", value: v, unit: "points", precision: 0, notes: [] };
  },
};

export default def;
