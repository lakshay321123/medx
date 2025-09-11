export type SerumOsmInputs = { na_mmol_l:number; glucose_mg_dl:number; bun_mg_dl:number; ethanol_mg_dl?:number };

export function calc_serum_osmolality(i: SerumOsmInputs): number {
  const ethanol = typeof i.ethanol_mg_dl === "number" ? i.ethanol_mg_dl : 0;
  return 2*i.na_mmol_l + i.glucose_mg_dl/18 + i.bun_mg_dl/2.8 + ethanol/3.7;
}

const def = {
  id: "serum_osmolality",
  label: "Serum Osmolality (calculated)",
  inputs: [
    { id: "na_mmol_l", label: "Sodium (mmol/L)", type: "number", min: 80, max: 200 },
    { id: "glucose_mg_dl", label: "Glucose (mg/dL)", type: "number", min: 0 },
    { id: "bun_mg_dl", label: "BUN (mg/dL)", type: "number", min: 0 },
    { id: "ethanol_mg_dl", label: "Ethanol (mg/dL)", type: "number", min: 0 }
  ],
  run: (args: SerumOsmInputs) => {
    const v = calc_serum_osmolality(args);
    return { id: "serum_osmolality", label: "Serum Osmolality", value: v, unit: "mOsm/kg", precision: 0, notes: [] };
  },
};

export default def;
