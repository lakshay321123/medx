import { runFreeWaterDeficit } from "@/lib/medical/engine/calculators/free_water_deficit";

test("Free water deficit basic", () => {
  const r = runFreeWaterDeficit({ sex:"male", age:40, weight_kg:70, na_measured:160 });
  expect(r.tbw_l).toBeCloseTo(42.0, 2); // 0.6*70
  // FWD = 42*((160/140)-1)=42*(0.142857)=6.0
  expect(r.fwd_l).toBeCloseTo(6.0, 2);
});
