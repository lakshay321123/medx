export type CHADSInputs = {
  congestive_heart_failure: boolean;
  hypertension: boolean;
  age_years: number;
  diabetes: boolean;
  stroke_tia_thromboembolism: boolean;
  vascular_disease: boolean; // MI, PAD, aortic plaque
  sex_female: boolean;
};

export function calc_cha2ds2_vasc(i: CHADSInputs): number {
  let s = 0;
  if (i.congestive_heart_failure) s += 1;
  if (i.hypertension) s += 1;
  if (i.age_years >= 75) s += 2;
  else if (i.age_years >= 65) s += 1;
  if (i.diabetes) s += 1;
  if (i.stroke_tia_thromboembolism) s += 2;
  if (i.vascular_disease) s += 1;
  if (i.sex_female) s += 1;
  return s;
}

const def = {
  id: "cha2ds2_vasc",
  label: "CHA₂DS₂-VASc (AF stroke risk)",
  inputs: [
    { id: "congestive_heart_failure", label: "Congestive heart failure", type: "boolean" },
    { id: "hypertension", label: "Hypertension", type: "boolean" },
    { id: "age_years", label: "Age (years)", type: "number", min: 0, max: 120 },
    { id: "diabetes", label: "Diabetes", type: "boolean" },
    { id: "stroke_tia_thromboembolism", label: "Stroke/TIA/thromboembolism", type: "boolean" },
    { id: "vascular_disease", label: "Vascular disease (MI/PAD/plaque)", type: "boolean" },
    { id: "sex_female", label: "Female sex", type: "boolean" }
  ],
  run: (args: CHADSInputs) => {
    const v = calc_cha2ds2_vasc(args);
    return { id: "cha2ds2_vasc", label: "CHA₂DS₂-VASc", value: v, unit: "points", precision: 0, notes: [] };
  },
};

export default def;
