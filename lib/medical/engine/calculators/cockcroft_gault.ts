export type CGInputs = {
  age_years: number;
  weight_kg: number;
  scr_mg_dl: number;
  sex: "male"|"female";
};

export function calc_cockcroft_gault(i: CGInputs): number {
  const factor = i.sex === "female" ? 0.85 : 1.0;
  const denom = 72 * Math.max(0.1, i.scr_mg_dl);
  const num = (140 - i.age_years) * i.weight_kg * factor;
  return num / denom;
}

const def = {
  id: "cockcroft_gault",
  label: "Creatinine Clearance (Cockcroft–Gault)",
  inputs: [
    { id: "age_years", label: "Age (years)", type: "number", min: 0, max: 120 },
    { id: "weight_kg", label: "Weight (kg)", type: "number", min: 1, max: 400 },
    { id: "scr_mg_dl", label: "Serum creatinine (mg/dL)", type: "number", min: 0.1, max: 20 },
    { id: "sex", label: "Sex", type: "select", options: [{label:"Male", value:"male"},{label:"Female", value:"female"}] }
  ],
  run: (args: CGInputs) => {
    const v = calc_cockcroft_gault(args);
    return { id: "cockcroft_gault", label: "CrCl (Cockcroft–Gault)", value: v, unit: "mL/min", precision: 0, notes: [] };
  },
};

export default def;
