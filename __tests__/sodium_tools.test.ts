
import { tbwLiters, adrogueMadiasDeltaNaPerL, planNaCorrection } from "../lib/medical/engine/calculators/sodium_tools";

test("TBW & Adrogue–Madias", () => {
  const tbw = tbwLiters({ weight_kg: 70, sex: "male", age_years: 40 });
  expect(tbw).toBeCloseTo(42, 1);
  const dNa = adrogueMadiasDeltaNaPerL(120, 513, tbw);
  expect(dNa).toBeGreaterThan(5); // ~9.3 mEq/L per liter 3% saline
});

test("Na guardrail clamps when high risk", () => {
  const plan = planNaCorrection({ currentNa_mEqL: 118, proposedRise_24h_mEq: 10, high_risk_ods: true });
  expect(plan.max_allowed_24h_mEq).toBe(6);
  expect(plan.clampedRise_24h_mEq).toBe(6);
});
