export type MDRDInputs = {
  scr_mg_dl: number;
  age_years: number;
  sex: "male"|"female";
  black?: boolean;
};

export function calc_egfr_mdrd(i: MDRDInputs): number {
  const a = 175 * Math.pow(i.scr_mg_dl, -1.154) * Math.pow(i.age_years, -0.203);
  const sex = i.sex === "female" ? 0.742 : 1.0;
  const race = i.black ? 1.212 : 1.0;
  return a * sex * race;
}

const def = {
  id: "egfr_mdrd",
  label: "eGFR (MDRD 4-variable)",
  inputs: [
    { id: "scr_mg_dl", label: "Serum creatinine (mg/dL)", type: "number", min: 0.1, max: 20 },
    { id: "age_years", label: "Age (years)", type: "number", min: 0, max: 120 },
    { id: "sex", label: "Sex", type: "select", options: [{label:"Male", value:"male"},{label:"Female", value:"female"}] },
    { id: "black", label: "African ancestry", type: "boolean" }
  ],
  run: (args: MDRDInputs) => {
    const v = calc_egfr_mdrd(args);
    return { id: "egfr_mdrd", label: "eGFR (MDRD)", value: v, unit: "mL/min/1.73m²", precision: 0, notes: [] };
  },
};

export default def;
