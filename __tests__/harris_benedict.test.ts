import { runHarrisBenedict } from "@/lib/medical/engine/calculators/harris_benedict";

test("Harris-Benedict", () => {
  const r = runHarrisBenedict({ sex:"male", weight_kg:80, height_cm:180, age:40 });
  expect(r.bee_kcal_day).toBeGreaterThan(1700);
});
