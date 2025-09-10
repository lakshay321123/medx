import { register } from "../registry";

/**
 * Ideal Body Weight (Devine) and Adjusted Body Weight (AdjBW = IBW + 0.4*(Actual - IBW))
 */
export function calc_body_weight_ideal_adjusted({
  height_cm, weight_kg, sex, adjustment_factor
}: {
  height_cm: number,
  weight_kg: number,
  sex: "male" | "female",
  adjustment_factor?: number
}) {
  const height_in = height_cm / 2.54;
  const inches_over_5ft = Math.max(0, height_in - 60);
  const ibw = (sex === "male" ? 50 : 45.5) + 2.3 * inches_over_5ft;
  const k = adjustment_factor ?? 0.4;
  const adjbw = weight_kg > ibw ? ibw + k * (weight_kg - ibw) : ibw;
  return { ibw, adjbw };
}

register({
  id: "body_weight_ideal_adjusted",
  label: "Ideal & Adjusted Body Weight",
  tags: ["dosing"],
  inputs: [
    { key: "height_cm", required: true },
    { key: "weight_kg", required: true },
    { key: "sex", required: true },
    { key: "adjustment_factor" }
  ],
  run: ({ height_cm, weight_kg, sex, adjustment_factor }: { height_cm: number; weight_kg: number; sex: "male" | "female"; adjustment_factor?: number; }) => {
    const r = calc_body_weight_ideal_adjusted({ height_cm, weight_kg, sex, adjustment_factor });
    const notes = [`IBW≈${Math.round(r.ibw)} kg`];
    return { id: "body_weight_ideal_adjusted", label: "Ideal & Adjusted Body Weight", value: r.adjbw, unit: "kg", precision: 1, notes, extra: r };
  },
});
