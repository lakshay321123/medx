import { runMifflinStJeor } from "@/lib/medical/engine/calculators/mifflin_st_jeor";

test("Mifflin-St Jeor", () => {
  const r = runMifflinStJeor({ sex:"female", weight_kg:60, height_cm:165, age:30 });
  expect(r.bmr_kcal_day).toBeGreaterThan(1200);
});
