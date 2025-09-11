// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_serum_osmolality, SerumOsmInputs } from "./serum_osmolality";

export type OsmGapInputs = SerumOsmInputs & { measured_mosm_kg: number };

export function calc_osmolar_gap(i: OsmGapInputs): { calculated: number; gap: number } {
  const calc = calc_serum_osmolality(i);
  return { calculated: calc, gap: i.measured_mosm_kg - calc };
}

const def = {
  id: "osmolar_gap",
  label: "Osmolar Gap",
  inputs: [
    { id: "measured_mosm_kg", label: "Measured osmolality (mOsm/kg)", type: "number", min: 0 },
    { id: "sodium_mmol_l", label: "Na (mmol/L)", type: "number", min: 80, max: 200 },
    { id: "glucose_mg_dl", label: "Glucose (mg/dL)", type: "number", min: 0 },
    { id: "bun_mg_dl", label: "BUN (mg/dL)", type: "number", min: 0 },
    { id: "ethanol_mg_dl", label: "Ethanol (mg/dL)", type: "number", min: 0 }
  ],
  run: (args: OsmGapInputs) => {
    const r = calc_osmolar_gap(args);
    const notes = [`Calculated ${r.calculated.toFixed(1)} mOsm/kg`];
    return { id: "osmolar_gap", label: "Osmolar Gap", value: r.gap, unit: "mOsm/kg", precision: 1, notes, extra: r };
  },
};

export default def;
