import { test, expect } from "@jest/globals";
import { norepiEquivalent } from "../lib/medical/engine/calculators/vaso_norepi_equiv";

test("NEE combines agents", () => {
  const out = norepiEquivalent({ norepi: 0.1, epi: 0.05, dopamine: 10, phenylephrine: 1.0, vasopressin: 0.03 });
  // NE 0.1 + EPI 0.05 + DOPA 0.10 + PHENY 0.10 + VASO 0.075 = 0.425
  expect(out.nee_total).toBeCloseTo(0.425, 3);
  expect(out.parts.vasopressin).toBeCloseTo(0.075, 3);
});
