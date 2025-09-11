export type AdjBWInputs = { actual_weight_kg: number; height_cm: number; sex: "male"|"female" };

export function calc_ideal_body_weight_from(height_cm: number, sex: "male"|"female"): number {
  const inches = height_cm / 2.54;
  const over60 = inches - 60;
  const base = sex === "male" ? 50 : 45.5;
  return base + 2.3 * over60;
}

export function calc_adjusted_body_weight(i: AdjBWInputs): { ibw: number; adjbw: number } {
  const ibw = calc_ideal_body_weight_from(i.height_cm, i.sex);
  const adj = ibw + 0.4 * (i.actual_weight_kg - ibw);
  return { ibw, adjbw: adj };
}

const def = {
  id: "adjusted_body_weight",
  label: "Adjusted Body Weight (for dosing)",
  inputs: [
    { id: "actual_weight_kg", label: "Actual weight (kg)", type: "number", min: 1, max: 400 },
    { id: "height_cm", label: "Height (cm)", type: "number", min: 50, max: 250 },
    { id: "sex", label: "Sex", type: "select", options: [{label:"Male", value:"male"},{label:"Female", value:"female"}] }
  ],
  run: (args: AdjBWInputs) => {
    const r = calc_adjusted_body_weight(args);
    return { id: "adjusted_body_weight", label: "Adjusted Body Weight", value: r.adjbw, unit: "kg", precision: 1, notes: [], extra: r };
  },
};

export default def;
