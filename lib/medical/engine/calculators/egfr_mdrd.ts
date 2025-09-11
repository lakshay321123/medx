// Batch 14 calculator
export type MDRDInputs = { sex: "male"|"female"; age_years: number; scr_mg_dl: number };

export function calc_egfr_mdrd(i: MDRDInputs): number {
  if (i.scr_mg_dl <= 0) return NaN;
  let egfr = 175 * Math.pow(i.scr_mg_dl, -1.154) * Math.pow(i.age_years, -0.203);
  if (i.sex === "female") egfr *= 0.742;
  return egfr;
}

const def = {
  id: "egfr_mdrd",
  label: "eGFR (MDRD-4)",
  inputs: [
    { id: "sex", label: "Sex", type: "select", options: [{label:"Male", value:"male"},{label:"Female", value:"female"}] },
    { id: "age_years", label: "Age (years)", type: "number", min: 0, max: 120 },
    { id: "scr_mg_dl", label: "Serum creatinine (mg/dL)", type: "number", min: 0.1, max: 20 }
  ],
  run: (args: MDRDInputs) => {
    const v = calc_egfr_mdrd(args);
    return { id: "egfr_mdrd", label: "eGFR (MDRD-4)", value: v, unit: "mL/min/1.73m²", precision: 0, notes: [] };
  },
};

export default def;
