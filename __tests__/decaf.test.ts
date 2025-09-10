import { test, expect } from "@jest/globals";
import { runDECAF } from "../lib/medical/engine/calculators/decaf";

test("DECAF high risk example", () => {
  const out = runDECAF({ emrcd_grade: 5, emrcd_five_b: true, eos_abs_x10e9_L: 0.01, consolidation_on_cxr: true, arterial_pH: 7.28, atrial_fibrillation: true });
  expect(out.points).toBe(6);
});
