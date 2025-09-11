export type CGInputs = { age_years:number; weight_kg:number; sex:"male"|"female"; scr_mg_dl:number };

export function calc_cockcroft_gault(i: CGInputs): number {
  const base = (140 - i.age_years) * i.weight_kg / (72 * i.scr_mg_dl);
  return i.sex === "female" ? base * 0.85 : base;
}

const def = {
  id: "cockcroft_gault",
  label: "Creatinine Clearance (Cockcroft–Gault)",
  inputs: [
    { id: "age_years", label: "Age (years)", type: "number", min: 0, max: 120 },
    { id: "weight_kg", label: "Weight (kg)", type: "number", min: 1, max: 400 },
    { id: "sex", label: "Sex", type: "select", options:[{label:"Male",value:"male"},{label:"Female",value:"female"}] },
    { id: "scr_mg_dl", label: "Serum creatinine (mg/dL)", type: "number", min: 0.1, max: 20 }
  ],
  run: (args: CGInputs) => {
    const v = calc_cockcroft_gault(args);
    return { id: "cockcroft_gault", label: "Cockcroft–Gault CrCl", value: v, unit: "mL/min", precision: 0, notes: [] };
  },
};

export default def;
