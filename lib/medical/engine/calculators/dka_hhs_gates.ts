// lib/medical/engine/calculators/dka_hhs_gates.ts
import { round, clamp } from "./utils";

export function insulinPotassiumGate(k_mEq_L: number) {
  if (k_mEq_L < 3.3) {
    return { gate: "hold_insulin_replete_K", message: "Hold insulin. Give K⁺ until >3.3 mEq/L, then start insulin." };
  }
  if (k_mEq_L <= 5.3) {
    return { gate: "start_insulin_add_K_to_fluids", message: "Start insulin AND add 20–30 mEq K⁺ per liter of fluids." };
  }
  return { gate: "start_insulin_no_K_yet", message: "Start insulin. No K⁺ replacement yet; monitor and add when K⁺ falls." };
}

export function bicarbonateConsider(pH: number) {
  return { consider_bicarb: pH < 6.9, note: "Bicarbonate may be considered when pH < 6.9 (controversial; individualize)." };
}

export function insulinRate(weight_kg: number, use_bolus = false) {
  const rate = 0.1 * weight_kg; // U/hr with standard 0.1 U/kg/h
  const bolus = use_bolus ? 0.1 * weight_kg : 0;
  return { insulin_u_per_hr: round(rate, 1), bolus_u: round(bolus, 1) };
}

export function initialFluidBolus(weight_kg: number) {
  // Guideline-friendly: 15–20 mL/kg once in the first hour (choose midpoint 17.5)
  const vol = 17.5 * weight_kg;
  return { first_hour_bolus_mL: Math.round(vol) };
}
