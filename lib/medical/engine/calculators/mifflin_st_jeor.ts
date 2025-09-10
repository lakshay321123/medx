/**
 * Mifflin-St Jeor BMR (kcal/day)
 * Male:   10*kg + 6.25*cm - 5*age + 5
 * Female: 10*kg + 6.25*cm - 5*age - 161
 */
export interface MSJInput { sex: "male" | "female"; weight_kg: number; height_cm: number; age: number; }
export interface MSJResult { bmr_kcal_day: number; }
export function runMifflinStJeor(i: MSJInput): MSJResult {
  const base = 10*i.weight_kg + 6.25*i.height_cm - 5*i.age;
  const bmr = i.sex === "male" ? base + 5 : base - 161;
  return { bmr_kcal_day: bmr };
}
