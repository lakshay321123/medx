import { calcTBW, adrogueMadiasDeltaPerLiter, predictDeltaForVolume, safeCorrectionGuardrail } from "../lib/medical/engine/calculators/sodium_tools";

test("TBW simple", () => {
  const { tbw_L } = calcTBW({ weight_kg: 70, sex: "male" });
  expect(tbw_L).toBeCloseTo(42, 2);
});

test("Adrogue–Madias ΔNa per liter and for volume", () => {
  const tbw = 42;
  const { delta_na_per_L_mEq } = adrogueMadiasDeltaPerLiter({ serum_na_mEq_L: 120, infusate_na_mEq_L: 154, tbw_L: tbw });
  // ((154 - 120)/(42+1)) ≈ 0.79 mEq/L per liter
  expect(delta_na_per_L_mEq).toBeCloseTo(0.79, 2);
  const { predicted_delta_mEq } = predictDeltaForVolume({ serum_na_mEq_L: 120, infusate_na_mEq_L: 154, tbw_L: tbw, liters: 3 });
  expect(predicted_delta_mEq).toBeCloseTo(2.38, 2);
});

test("Safe correction guardrail", () => {
  const out = safeCorrectionGuardrail(120, 12, true);
  expect(out.max_allowed_delta_mEq_24h).toBe(8);
  expect(out.exceeds_limit).toBe(true);
});
