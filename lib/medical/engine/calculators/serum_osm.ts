export type SerumOsmInputs = {
  na_mmol_l: number;
  glucose_mg_dl: number;
  bun_mg_dl: number;
  ethanol_mg_dl?: number;
  measured_osm_mOsm_kg?: number;
};

export function calc_serum_osm(i: SerumOsmInputs): { calculated: number; osm_gap?: number } {
  let calc = 2 * i.na_mmol_l + i.glucose_mg_dl / 18 + i.bun_mg_dl / 2.8;
  if (typeof i.ethanol_mg_dl === "number") calc += i.ethanol_mg_dl / 3.7;
  let osm_gap: number | undefined = undefined;
  if (typeof i.measured_osm_mOsm_kg === "number") osm_gap = i.measured_osm_mOsm_kg - calc;
  return { calculated: calc, osm_gap };
}

const def = {
  id: "serum_osm",
  label: "Serum Osmolality (± gap)",
  inputs: [
    { id: "na_mmol_l", label: "Na (mmol/L)", type: "number", min: 80, max: 200 },
    { id: "glucose_mg_dl", label: "Glucose (mg/dL)", type: "number", min: 0 },
    { id: "bun_mg_dl", label: "BUN (mg/dL)", type: "number", min: 0 },
    { id: "ethanol_mg_dl", label: "Ethanol (mg/dL)", type: "number", min: 0 },
    { id: "measured_osm_mOsm_kg", label: "Measured osmolality (mOsm/kg)", type: "number", min: 0 }
  ],
  run: (args: SerumOsmInputs) => {
    const r = calc_serum_osm(args);
    const notes = [typeof r.osm_gap === "number" ? `Gap ${r.osm_gap.toFixed(1)} mOsm/kg` : ""];
    return { id: "serum_osm", label: "Calculated Osmolality", value: r.calculated, unit: "mOsm/kg", precision: 1, notes: notes.filter(Boolean), extra: r };
  },
};

export default def;
