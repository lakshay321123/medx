export type OsmGapInputs = { na_mmol_l:number; glucose_mg_dl:number; bun_mg_dl:number; ethanol_mg_dl?:number; measured_mosm_kg:number };

export function calc_osmolar_gap(i: OsmGapInputs): { calculated:number; gap:number } {
  const ethanol = typeof i.ethanol_mg_dl === "number" ? i.ethanol_mg_dl : 0;
  const calculated = 2*i.na_mmol_l + i.glucose_mg_dl/18 + i.bun_mg_dl/2.8 + ethanol/3.7;
  const gap = i.measured_mosm_kg - calculated;
  return { calculated, gap };
}

const def = {
  id: "osmolar_gap",
  label: "Osmolar Gap",
  inputs: [
    { id: "na_mmol_l", label: "Sodium (mmol/L)", type: "number", min: 80, max: 200 },
    { id: "glucose_mg_dl", label: "Glucose (mg/dL)", type: "number", min: 0 },
    { id: "bun_mg_dl", label: "BUN (mg/dL)", type: "number", min: 0 },
    { id: "ethanol_mg_dl", label: "Ethanol (mg/dL)", type: "number", min: 0 },
    { id: "measured_mosm_kg", label: "Measured osmolality (mOsm/kg)", type: "number", min: 0 }
  ],
  run: (args: OsmGapInputs) => {
    const r = calc_osmolar_gap(args);
    const notes = [`Calculated ${r.calculated.toFixed(0)} mOsm/kg`];
    return { id: "osmolar_gap", label: "Osmolar Gap", value: r.gap, unit: "mOsm/kg", precision: 0, notes, extra: r };
  },
};

export default def;
