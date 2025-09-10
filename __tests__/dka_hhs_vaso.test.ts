import { insulinAndPotassiumGate } from "../lib/medical/engine/calculators/dka_hhs_gates";
import { norepiEquivalent } from "../lib/medical/engine/calculators/vasopressor_equiv";

test("DKA gates", () => {
  const out = insulinAndPotassiumGate({ potassium_mEq_L: 3.0, pH: 6.85 });
  expect(out.insulin).toBe("hold");
});

test("NE equivalents", () => {
  const out = norepiEquivalent({ norepi: 0.08, epi: 0.02, vasopressin_U_min: 0.03 });
  expect(out.norepi_eq_ug_kg_min).toBeGreaterThan(0);
});
