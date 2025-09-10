import { runSodiumDeficit } from "@/lib/medical/engine/calculators/sodium_deficit";

test("Sodium deficit", () => {
  const r = runSodiumDeficit({ sex:"female", age:30, weight_kg:60, current_na:118, target_na:128 });
  // TBW = 0.5*60=30L; deficit=30*(10)=300 mEq
  expect(r.tbw_l).toBeCloseTo(30, 2);
  expect(r.deficit_meq).toBeCloseTo(300, 2);
});
