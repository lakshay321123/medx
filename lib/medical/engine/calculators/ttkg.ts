// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

export type TTKGInputs = {
  urine_k_mmol_l: number;
  plasma_k_mmol_l: number;
  urine_osm_mosm_kg: number;
  plasma_osm_mosm_kg: number;
};

export function calc_ttkg(i: TTKGInputs): number {
  if (i.plasma_k_mmol_l <= 0 || i.urine_osm_mosm_kg <= 0) return NaN;
  return (i.urine_k_mmol_l / i.plasma_k_mmol_l) * (i.plasma_osm_mosm_kg / i.urine_osm_mosm_kg);
}

const def = {
  id: "ttkg",
  label: "Transtubular Potassium Gradient (TTKG)",
  inputs: [
    { id: "urine_k_mmol_l", label: "Urine K (mmol/L)", type: "number", min: 0 },
    { id: "plasma_k_mmol_l", label: "Plasma K (mmol/L)", type: "number", min: 0 },
    { id: "urine_osm_mosm_kg", label: "Urine Osm (mOsm/kg)", type: "number", min: 1 },
    { id: "plasma_osm_mosm_kg", label: "Plasma Osm (mOsm/kg)", type: "number", min: 1 }
  ],
  run: (args: TTKGInputs) => {
    const v = calc_ttkg(args);
    return { id: "ttkg", label: "TTKG", value: v, unit: "", precision: 1, notes: [] };
  },
};

export default def;
