/**
 * Harris-Benedict BEE (kcal/day)
 * Male:   66.47 + 13.75*kg + 5.00*cm - 6.76*age
 * Female: 655.10 + 9.56*kg + 1.85*cm - 4.68*age
 */
export interface HBInput { sex: "male" | "female"; weight_kg: number; height_cm: number; age: number; }
export interface HBResult { bee_kcal_day: number; }
export function runHarrisBenedict(i: HBInput): HBResult {
  let bee: number;
  if (i.sex === "male") bee = 66.47 + 13.75*i.weight_kg + 5.0*i.height_cm - 6.76*i.age;
  else bee = 655.1 + 9.56*i.weight_kg + 1.85*i.height_cm - 4.68*i.age;
  return { bee_kcal_day: bee };
}
