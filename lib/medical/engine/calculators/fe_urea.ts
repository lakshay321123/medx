export type FeUreaInputs = { urine_urea_mg_dl:number; plasma_urea_mg_dl:number; urine_cr_mg_dl:number; plasma_cr_mg_dl:number };

export function calc_fe_urea(i: FeUreaInputs): number {
  if (i.plasma_urea_mg_dl === 0 || i.urine_cr_mg_dl === 0) return 0;
  return (i.urine_urea_mg_dl * i.plasma_cr_mg_dl) / (i.plasma_urea_mg_dl * i.urine_cr_mg_dl) * 100;
}

const def = {
  id: "fe_urea",
  label: "Fractional Excretion of Urea (FeUrea)",
  inputs: [
    { id: "urine_urea_mg_dl", label: "Urine urea nitrogen (mg/dL)", type: "number", min: 0 },
    { id: "plasma_urea_mg_dl", label: "Plasma urea nitrogen (mg/dL)", type: "number", min: 0 },
    { id: "urine_cr_mg_dl", label: "Urine creatinine (mg/dL)", type: "number", min: 0 },
    { id: "plasma_cr_mg_dl", label: "Plasma creatinine (mg/dL)", type: "number", min: 0 }
  ],
  run: (args: FeUreaInputs) => {
    const v = calc_fe_urea(args);
    return { id: "fe_urea", label: "FeUrea", value: v, unit: "%", precision: 2, notes: [] };
  },
};

export default def;
