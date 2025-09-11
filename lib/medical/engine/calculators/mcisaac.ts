export type McIsaacInputs = {
  age_years: number;
  fever_history: boolean;
  absence_of_cough: boolean;
  tender_anterior_nodes: boolean;
  tonsillar_swelling_exudate: boolean;
};

export function calc_mcisaac(i: McIsaacInputs): { score: number } {
  let s = 0;
  if (i.fever_history) s += 1;
  if (i.absence_of_cough) s += 1;
  if (i.tender_anterior_nodes) s += 1;
  if (i.tonsillar_swelling_exudate) s += 1;
  if (i.age_years <= 14) s += 1;
  else if (i.age_years >= 45) s -= 1;
  return { score: s };
}

const def = {
  id: "mcisaac",
  label: "McIsaac (modified Centor)",
  inputs: [
    { id: "age_years", label: "Age (years)", type: "number", min: 0, max: 120 },
    { id: "fever_history", label: "Fever history", type: "boolean" },
    { id: "absence_of_cough", label: "Absence of cough", type: "boolean" },
    { id: "tender_anterior_nodes", label: "Tender anterior cervical nodes", type: "boolean" },
    { id: "tonsillar_swelling_exudate", label: "Tonsillar swelling or exudate", type: "boolean" }
  ],
  run: (args: McIsaacInputs) => {
    const r = calc_mcisaac(args);
    return { id: "mcisaac", label: "McIsaac (Centor)", value: r.score, unit: "points", precision: 0, notes: [] };
  },
};

export default def;
