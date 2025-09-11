// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.


export type SerumOsmInputs = {
  sodium_mmol_l: number;
  glucose_mg_dl: number;
  bun_mg_dl: number;
  ethanol_mg_dl?: number;
  measured_osm_mosm_kg?: number;
};

export function calc_serum_osm(i: SerumOsmInputs): { calc: number; gap?: number } {
  const ethanol = i.ethanol_mg_dl ?? 0;
  const calc = 2 * i.sodium_mmol_l + i.glucose_mg_dl / 18 + i.bun_mg_dl / 2.8 + ethanol / 3.7;
  const out: { calc: number; gap?: number } = { calc };
  if (typeof i.measured_osm_mosm_kg === "number") {
    out.gap = i.measured_osm_mosm_kg - calc;
  }
  return out;
}

const def = {
  id: "serum_osmolality",
  label: "Serum Osmolality",
  inputs: [
    { id: "sodium_mmol_l", label: "Sodium (mmol/L)", type: "number", min: 80, max: 200 },
    { id: "glucose_mg_dl", label: "Glucose (mg/dL)", type: "number", min: 0 },
    { id: "bun_mg_dl", label: "BUN (mg/dL)", type: "number", min: 0 },
    { id: "ethanol_mg_dl", label: "Ethanol (mg/dL)", type: "number", min: 0 },
    { id: "measured_osm_mosm_kg", label: "Measured osmolality (mOsm/kg)", type: "number", min: 0 }
  ],
  run: (args: SerumOsmInputs) => {
    const r = calc_serum_osm(args);
    const notes: string[] = [];
    if (typeof r.gap === "number") notes.push(`Gap ${r.gap.toFixed(1)} mOsm/kg`);
    return { id: "serum_osmolality", label: "Serum Osmolality", value: r.calc, unit: "mOsm/kg", precision: 1, notes, extra: r };
  },
};

export default def;
