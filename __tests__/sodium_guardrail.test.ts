
import { safeNaCorrectionPlanner, tbwEstimate } from "../lib/medical/engine/calculators/sodium_tools";

test("Na correction guardrails", () => {
  const plan = safeNaCorrectionPlanner(112, 122, 12); // 10 mEq in 12h => 20/24h
  expect(plan.exceeds_24h_limit).toBe(true);
  expect(plan.guardrails.limit_24h_mEq).toBe(8);
});

test("TBW estimate varies by sex/age", () => {
  const a = tbwEstimate(70, "male", 30);
  const b = tbwEstimate(70, "female", 70);
  expect(a).toBeGreaterThan(b);
});
