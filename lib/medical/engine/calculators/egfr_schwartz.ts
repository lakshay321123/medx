export type SchwartzInputs = { height_cm:number; creatinine_mg_dl:number };

export function calc_egfr_schwartz(i: SchwartzInputs): number {
  return 0.413 * i.height_cm / i.creatinine_mg_dl;
}

const def = {
  id: "egfr_schwartz",
  label: "eGFR (Schwartz, pediatric)",
  inputs: [
    { id: "height_cm", label: "Height (cm)", type: "number", min: 20, max: 220 },
    { id: "creatinine_mg_dl", label: "Creatinine (mg/dL)", type: "number", min: 0.1, max: 20 }
  ],
  run: (args: SchwartzInputs) => {
    const v = calc_egfr_schwartz(args);
    return { id: "egfr_schwartz", label: "eGFR (Schwartz)", value: v, unit: "mL/min/1.73m²", precision: 0, notes: [] };
  },
};
export default def;
