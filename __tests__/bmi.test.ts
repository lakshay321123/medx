import { runBMI } from "@/lib/medical/engine/calculators/bmi";

test("BMI calc", () => {
  const r = runBMI({ weight_kg:80, height_cm:180 });
  expect(r.bmi).toBeCloseTo(24.69, 2);
  expect(r.band).toBe("normal");
});
