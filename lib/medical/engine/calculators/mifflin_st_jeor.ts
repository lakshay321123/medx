import { register } from "../registry";
/**
 * Mifflin–St Jeor — Resting Energy Expenditure (REE)
 * male:   10*W + 6.25*H - 5*A + 5
 * female: 10*W + 6.25*H - 5*A - 161
 * Inputs: weight_kg, height_cm, age_years, sex ("male"|"female")
 */
export function calc_mifflin_st_jeor({ weight_kg, height_cm, age_years, sex }:
  { weight_kg: number, height_cm: number, age_years: number, sex: "male" | "female" }) {
  if (weight_kg == null || height_cm == null || age_years == null || !sex) return null;
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age_years;
  return sex === "male" ? base + 5 : base - 161;
}

register({
  id: "mifflin_st_jeor",
  label: "Mifflin–St Jeor (REE)",
  tags: ["nutrition", "metabolism"],
  inputs: [
    { key: "weight_kg", required: true },
    { key: "height_cm", required: true },
    { key: "age_years", required: true },
    { key: "sex", required: true },
  ],
  run: ({ weight_kg, height_cm, age_years, sex }) => {
    const v = calc_mifflin_st_jeor({ weight_kg, height_cm, age_years, sex });
    if (v == null) return null;
    return { id: "mifflin_st_jeor", label: "Mifflin–St Jeor (REE)", value: v, unit: "kcal/day", precision: 0, notes: [] };
  },
});
