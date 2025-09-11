// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_ibw_devine } from "./ibw_devine";

export type AdjBWInputs = { sex: "male" | "female"; height_cm: number; actual_weight_kg: number };

export function calc_adjusted_body_weight(i: AdjBWInputs): { ibw: number; adjbw: number } {
  const ibw = calc_ibw_devine({ sex: i.sex, height_cm: i.height_cm });
  const adj = i.actual_weight_kg > ibw ? ibw + 0.4 * (i.actual_weight_kg - ibw) : i.actual_weight_kg;
  return { ibw, adjbw: adj };
}

const def = {
  id: "adjusted_body_weight",
  label: "Adjusted Body Weight (for dosing)",
  inputs: [
    { id: "sex", label: "Sex", type: "select", options: [{label:"Male", value:"male"},{label:"Female", value:"female"}]},
    { id: "height_cm", label: "Height (cm)", type: "number", min: 100, max: 250 },
    { id: "actual_weight_kg", label: "Actual weight (kg)", type: "number", min: 1, max: 500 }
  ],
  run: (args: AdjBWInputs) => {
    const r = calc_adjusted_body_weight(args);
    const notes = [`IBW ${r.ibw.toFixed(1)} kg`];
    return { id: "adjusted_body_weight", label: "Adjusted Body Weight", value: r.adjbw, unit: "kg", precision: 2, notes, extra: r };
  },
};

export default def;
