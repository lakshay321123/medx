// lib/medical/engine/calculators/sodium_tools.ts
import { round, clamp } from "./utils";

export interface TBWInput {
  weight_kg: number;
  sex?: "male" | "female";
  tbw_factor_override?: number | null; // if provided, use directly
}

/** Simple TBW = factor × weight. Default factors: male 0.6, female 0.5. */
export function calcTBW(i: TBWInput) {
  const f = (typeof i.tbw_factor_override === "number")
    ? i.tbw_factor_override!
    : (i.sex === "female" ? 0.5 : 0.6);
  return { tbw_L: round(f * i.weight_kg, 2), factor_used: f };
}

export interface AdrogueMadiasInput {
  serum_na_mEq_L: number;
  infusate_na_mEq_L: number;
  infusate_k_mEq_L?: number | null;
  tbw_L: number;
}

/** Adrogué–Madias predicted ΔNa per liter infused: ΔNa = ([Na_inf + K_inf] − [Na_serum]) / (TBW + 1) */
export function adrogueMadiasDeltaPerLiter(i: AdrogueMadiasInput) {
  const kinf = i.infusate_k_mEq_L ?? 0;
  const delta = ((i.infusate_na_mEq_L + kinf) - i.serum_na_mEq_L) / Math.max(i.tbw_L + 1, 1e-6);
  return { delta_na_per_L_mEq: round(delta, 2) };
}

export function predictDeltaForVolume(i: AdrogueMadiasInput & { liters: number }) {
  const { delta_na_per_L_mEq } = adrogueMadiasDeltaPerLiter(i);
  return { predicted_delta_mEq: round(delta_na_per_L_mEq * i.liters, 2) };
}

export function safeCorrectionGuardrail(current_na: number, planned_delta_24h_mEq: number, high_risk: boolean) {
  const maxAllowed = high_risk ? 8 : 10;
  const over = planned_delta_24h_mEq > maxAllowed;
  const target_na_24h = current_na + clamp(planned_delta_24h_mEq, -maxAllowed, maxAllowed);
  return { max_allowed_delta_mEq_24h: maxAllowed, exceeds_limit: over, target_na_24h };
}
