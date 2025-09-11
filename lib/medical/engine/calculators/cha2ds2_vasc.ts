// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.


export type CHA2DS2VAScInputs = {
  age_years: number;
  sex: "male" | "female";
  chf: boolean;
  htn: boolean;
  diabetes: boolean;
  stroke_tia_te: boolean;
  vascular_disease: boolean;
};

export function calc_cha2ds2_vasc({
  age_years, sex, chf, htn, diabetes, stroke_tia_te, vascular_disease
}: CHA2DS2VAScInputs): number {
  let s = 0;
  if (chf) s += 1;
  if (htn) s += 1;
  if (age_years >= 75) s += 2;
  else if (age_years >= 65) s += 1;
  if (diabetes) s += 1;
  if (stroke_tia_te) s += 2;
  if (vascular_disease) s += 1;
  if (sex === "female") s += 1;
  return s;
}

const def = {
  id: "cha2ds2_vasc",
  label: "CHA2DS2-VASc (AF)",
  inputs: [
    { id: "age_years", label: "Age", type: "number", min: 0, max: 120 },
    { id: "sex", label: "Sex", type: "select", options: [{label:"Male", value:"male"}, {label:"Female", value:"female"}] },
    { id: "chf", label: "CHF/LV dysfunction", type: "boolean" },
    { id: "htn", label: "Hypertension", type: "boolean" },
    { id: "diabetes", label: "Diabetes", type: "boolean" },
    { id: "stroke_tia_te", label: "Stroke/TIA/TE", type: "boolean" },
    { id: "vascular_disease", label: "Vascular disease", type: "boolean" }
  ],
  run: (args: CHA2DS2VAScInputs) => {
    const v = calc_cha2ds2_vasc(args);
    return { id: "cha2ds2_vasc", label: "CHA2DS2-VASc", value: v, unit: "score", precision: 0, notes: [] };
  },
};

export default def;
