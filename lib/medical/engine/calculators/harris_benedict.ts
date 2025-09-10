import { register } from "../registry";
/**
 * Harris–Benedict — BMR and optional TEE (activity factor)
 * male:   66.47 + 13.75*W + 5.0*H - 6.76*A
 * female: 655.1 + 9.56*W + 1.85*H - 4.68*A
 * Inputs: weight_kg, height_cm, age_years, sex ("male"|"female"), activity_factor? (1.2–1.9)
 */
export function calc_harris_benedict({ weight_kg, height_cm, age_years, sex }:
  { weight_kg: number, height_cm: number, age_years: number, sex: "male" | "female" }) {
  if (weight_kg == null || height_cm == null || age_years == null || !sex) return null;
  if (sex === "male") {
    return 66.47 + 13.75 * weight_kg + 5.0 * height_cm - 6.76 * age_years;
  } else {
    return 655.1 + 9.56 * weight_kg + 1.85 * height_cm - 4.68 * age_years;
  }
}

register({
  id: "harris_benedict",
  label: "Harris–Benedict (BMR/TEE)",
  tags: ["nutrition", "metabolism"],
  inputs: [
    { key: "weight_kg", required: true },
    { key: "height_cm", required: true },
    { key: "age_years", required: true },
    { key: "sex", required: true },
    { key: "activity_factor" },
  ],
  run: ({ weight_kg, height_cm, age_years, sex, activity_factor }) => {
    const bmr = calc_harris_benedict({ weight_kg, height_cm, age_years, sex });
    if (bmr == null) return null;
    const tee = (typeof activity_factor === "number" && activity_factor > 0) ? bmr * activity_factor : undefined;
    const notes = tee ? [`TEE=${Math.round(tee)} kcal/day @ factor ${activity_factor}`] : [];
    return { id: "harris_benedict", label: "Harris–Benedict (BMR/TEE)", value: bmr, unit: "kcal/day", precision: 0, notes };
  },
});
