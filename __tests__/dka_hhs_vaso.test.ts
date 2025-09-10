import { insulinPotassiumGate, bicarbonateConsider, insulinRate, initialFluidBolus } from "../lib/medical/engine/calculators/dka_hhs_gates";

test("K+ gating", () => {
  expect(insulinPotassiumGate(3.0).gate).toBe("hold_insulin_replete_K");
  expect(insulinPotassiumGate(4.0).gate).toBe("start_insulin_add_K_to_fluids");
  expect(insulinPotassiumGate(6.0).gate).toBe("start_insulin_no_K_yet");
});

test("Bicarbonate threshold", () => {
  expect(bicarbonateConsider(6.85).consider_bicarb).toBe(true);
  expect(bicarbonateConsider(7.10).consider_bicarb).toBe(false);
});

test("Insulin dosing and fluids", () => {
  const dose = insulinRate(70, true);
  expect(dose.insulin_u_per_hr).toBeCloseTo(7.0, 1);
  expect(dose.bolus_u).toBeCloseTo(7.0, 1);

  const bolus = initialFluidBolus(70);
  expect(bolus.first_hour_bolus_mL).toBe(1225);
});
