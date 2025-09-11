// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.


export type CgInputs = {
  age_years: number;
  weight_kg: number;
  sex: "male" | "female";
  creatinine_mg_dl: number;
};

export function calc_cockcroft_gault({ age_years, weight_kg, sex, creatinine_mg_dl }: CgInputs): number {
  if (creatinine_mg_dl <= 0) return NaN;
  let crcl = ((140 - age_years) * weight_kg) / (72 * creatinine_mg_dl);
  if (sex === "female") crcl *= 0.85;
  return crcl;
}

const def = {
  id: "cockcroft_gault",
  label: "Cockcroft–Gault (CrCl)",
  inputs: [
    { id: "age_years", label: "Age", type: "number", min: 0, max: 120 },
    { id: "weight_kg", label: "Weight (kg)", type: "number", min: 1, max: 300 },
    { id: "sex", label: "Sex", type: "select", options: [{label:"Male", value:"male"}, {label:"Female", value:"female"}] },
    { id: "creatinine_mg_dl", label: "Creatinine (mg/dL)", type: "number", min: 0 }
  ],
  run: (args: CgInputs) => {
    const v = calc_cockcroft_gault(args);
    return { id: "cockcroft_gault", label: "Cockcroft–Gault (CrCl)", value: v, unit: "mL/min", precision: 1, notes: [] };
  },
};

export default def;
