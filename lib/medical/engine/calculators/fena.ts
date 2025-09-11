export type FeNaInputs = { urine_na_mmol_l:number; plasma_na_mmol_l:number; urine_cr_mg_dl:number; plasma_cr_mg_dl:number };

export function calc_fena(i: FeNaInputs): number {
  if (i.plasma_na_mmol_l === 0 || i.urine_cr_mg_dl === 0) return 0;
  return (i.urine_na_mmol_l * i.plasma_cr_mg_dl) / (i.plasma_na_mmol_l * i.urine_cr_mg_dl) * 100;
}

const def = {
  id: "fena",
  label: "Fractional Excretion of Sodium (FeNa)",
  inputs: [
    { id: "urine_na_mmol_l", label: "Urine Na (mmol/L)", type: "number", min: 0 },
    { id: "plasma_na_mmol_l", label: "Plasma Na (mmol/L)", type: "number", min: 0 },
    { id: "urine_cr_mg_dl", label: "Urine creatinine (mg/dL)", type: "number", min: 0 },
    { id: "plasma_cr_mg_dl", label: "Plasma creatinine (mg/dL)", type: "number", min: 0 }
  ],
  run: (args: FeNaInputs) => {
    const v = calc_fena(args);
    return { id: "fena", label: "FeNa", value: v, unit: "%", precision: 2, notes: [] };
  },
};

export default def;
