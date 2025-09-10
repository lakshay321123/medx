
import { runCalorieGoal } from "@/lib/medical/engine/calculators/calorie_goal";
import { runProteinGoal } from "@/lib/medical/engine/calculators/protein_goal";
test("Calorie goal MSJ", () => {
  const r = runCalorieGoal({ sex: "male", age: 30, weight_kg: 80, height_cm: 180, activity_factor: 1.2, stress_factor: 1.0 });
  expect(r.bmr_kcal_day).toBeGreaterThan(1600);
  expect(r.tdee_kcal_day).toBeGreaterThan(r.bmr_kcal_day);
});
test("Protein goal default 1.2 g/kg", () => {
  const r = runProteinGoal({ weight_kg: 70 });
  expect(r.protein_g_per_day).toBe(84);
});
