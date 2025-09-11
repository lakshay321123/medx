export type CHA2DS2VAScInputs = {
  chf: boolean;
  htn: boolean;
  age_years: number;
  diabetes: boolean;
  stroke_tia_te: boolean;
  vascular: boolean;
  sex: "male"|"female";
};

export function calc_cha2ds2_vasc(i: CHA2DS2VAScInputs): number {
  let s = 0;
  if (i.chf) s += 1;
  if (i.htn) s += 1;
  if (i.age_years >= 75) s += 2;
  else if (i.age_years >= 65) s += 1;
  if (i.diabetes) s += 1;
  if (i.stroke_tia_te) s += 2;
  if (i.vascular) s += 1;
  if (i.sex === "female") s += 1;
  return s;
}

const def = {
  id: "cha2ds2_vasc",
  label: "CHA₂DS₂-VASc (AF stroke risk)",
  inputs: [
    { id: "chf", label: "Congestive heart failure", type: "boolean" },
    { id: "htn", label: "Hypertension", type: "boolean" },
    { id: "age_years", label: "Age (years)", type: "number", min: 0, max: 120 },
    { id: "diabetes", label: "Diabetes", type: "boolean" },
    { id: "stroke_tia_te", label: "Stroke/TIA/TE history", type: "boolean" },
    { id: "vascular", label: "Vascular disease (MI/PAD/aortic plaque)", type: "boolean" },
    { id: "sex", label: "Sex", type: "select", options: [{label:"Male", value:"male"},{label:"Female", value:"female"}] }
  ],
  run: (args: CHA2DS2VAScInputs) => {
    const v = calc_cha2ds2_vasc(args);
    return { id: "cha2ds2_vasc", label: "CHA₂DS₂-VASc", value: v, unit: "points", precision: 0, notes: [] };
  },
};

export default def;
