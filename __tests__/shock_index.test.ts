import { runShockIndex } from "@/lib/medical/engine/calculators/shock_index";

test("Shock index bands", () => {
  const r = runShockIndex({ hr_bpm:110, sbp_mmHg:100 });
  expect(r.index).toBeCloseTo(1.1, 2);
  expect(r.band).toBe("moderate");
});
