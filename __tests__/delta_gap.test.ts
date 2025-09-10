import { runDeltaGap } from "@/lib/medical/engine/calculators/delta_gap";

test("Delta gap", () => {
  const r = runDeltaGap({ anion_gap:24, hco3:12 }); // deltaAG=12, deltaHCO3=12, ratio=1
  expect(r.delta_ag).toBe(12);
  expect(r.delta_hco3).toBe(12);
  expect(r.ratio).toBeCloseTo(1, 3);
  expect(r.interpretation).toMatch(/pure high anion gap/);
});
