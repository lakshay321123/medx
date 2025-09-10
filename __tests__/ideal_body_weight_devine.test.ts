import { runIBWDevine } from "@/lib/medical/engine/calculators/ideal_body_weight_devine";

test("IBW Devine", () => {
  const r = runIBWDevine({ sex: "male", height_cm: 180 });
  // inches approximately 70.866; over 5 ft approximately 10.866; IBW equals 50 + 2.3*(10.866)
  expect(r.ibw_kg).toBeCloseTo(50 + 2.3 * (70.8661417 - 60), 2);
});
