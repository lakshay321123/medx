import { register } from "../registry";
/**
 * BMI — Body Mass Index
 * Inputs: weight_kg, height_cm | height_m
 */
export function calc_bmi({ weight_kg, height_cm, height_m }: { weight_kg: number, height_cm?: number, height_m?: number }) {
  if (weight_kg == null) return null;
  const h = (height_m != null ? height_m : (height_cm != null ? height_cm / 100 : null));
  if (h == null || h <= 0) return null;
  const v = weight_kg / (h * h);
  return v;
}

function classifyBMI(v: number): string {
  if (v < 18.5) return "underweight";
  if (v < 25) return "normal";
  if (v < 30) return "overweight";
  return "obesity";
}

register({
  id: "bmi",
  label: "Body Mass Index",
  tags: ["nutrition", "vitals"],
  inputs: [
    { key: "weight_kg", required: true },
    { key: "height_cm" },
    { key: "height_m" },
  ],
  run: ({ weight_kg, height_cm, height_m }) => {
    const v = calc_bmi({ weight_kg, height_cm, height_m });
    if (v == null) return null;
    const notes = [classifyBMI(v)];
    return { id: "bmi", label: "Body Mass Index", value: v, unit: "kg/m²", precision: 1, notes };
  },
});
