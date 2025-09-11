// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.


export type MDRDInputs = {
  sex: "male" | "female";
  age_years: number;
  creatinine_mg_dl: number;
};

export function calc_mdrd_egfr({ sex, age_years, creatinine_mg_dl }: MDRDInputs): number {
  if (creatinine_mg_dl <= 0) return NaN;
  let egfr = 175 * Math.pow(creatinine_mg_dl, -1.154) * Math.pow(age_years, -0.203);
  if (sex === "female") egfr *= 0.742;
  return egfr;
}

const def = {
  id: "mdrd_egfr",
  label: "eGFR (MDRD, race-neutral)",
  inputs: [
    { id: "sex", label: "Sex", type: "select", options: [{label:"Male", value:"male"},{label:"Female", value:"female"}]},
    { id: "age_years", label: "Age", type: "number", min: 0, max: 120 },
    { id: "creatinine_mg_dl", label: "Creatinine (mg/dL)", type: "number", min: 0 }
  ],
  run: (args: MDRDInputs) => {
    const v = calc_mdrd_egfr(args);
    return { id: "mdrd_egfr", label: "eGFR (MDRD)", value: v, unit: "mL/min/1.73m²", precision: 0, notes: [] };
  },
};

export default def;
