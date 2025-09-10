import { test, expect } from "@jest/globals";
import { runHACOR } from "../lib/medical/engine/calculators/hacor";

test("HACOR sample", () => {
  const out = runHACOR({ hr_bpm: 125, arterial_pH: 7.28, gcs: 12, pf_ratio: 140, rr_bpm: 32 });
  expect(out.points).toBeGreaterThanOrEqual(1);
  expect(out.components.ph).toBeGreaterThan(0);
});
