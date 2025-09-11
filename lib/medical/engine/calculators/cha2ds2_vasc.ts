// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

export type CHA2DS2VAScInputs = {
  chf: boolean;
  htn: boolean;
  age_75_or_more: boolean;
  diabetes: boolean;
  stroke_tia_te: boolean;
  vascular_disease: boolean;
  age_65_74: boolean;
  sex_female: boolean;
};

export function calc_cha2ds2_vasc(i: CHA2DS2VAScInputs): number {
  let s = 0;
  if (i.chf) s += 1;
  if (i.htn) s += 1;
  if (i.age_75_or_more) s += 2;
  if (i.diabetes) s += 1;
  if (i.stroke_tia_te) s += 2;
  if (i.vascular_disease) s += 1;
  if (i.age_65_74) s += 1;
  if (i.sex_female) s += 1;
  return s;
}

const def = {
  id: "cha2ds2_vasc",
  label: "CHA2DS2-VASc (AF stroke risk)",
  inputs: [
    { id: "chf", label: "CHF/LV dysfunction", type: "boolean" },
    { id: "htn", label: "Hypertension", type: "boolean" },
    { id: "age_75_or_more", label: "Age ≥75", type: "boolean" },
    { id: "diabetes", label: "Diabetes", type: "boolean" },
    { id: "stroke_tia_te", label: "Stroke/TIA/Thromboembolism", type: "boolean" },
    { id: "vascular_disease", label: "Vascular disease", type: "boolean" },
    { id: "age_65_74", label: "Age 65–74", type: "boolean" },
    { id: "sex_female", label: "Female sex", type: "boolean" }
  ],
  run: (args: CHA2DS2VAScInputs) => {
    const v = calc_cha2ds2_vasc(args);
    return { id: "cha2ds2_vasc", label: "CHA2DS2-VASc", value: v, unit: "score", precision: 0, notes: [] };
  },
};

export default def;
