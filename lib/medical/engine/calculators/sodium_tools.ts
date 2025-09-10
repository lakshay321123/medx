import { round } from "./utils";

export type Sex = "male" | "female";
export function tbwEstimate(weight_kg: number, sex: Sex, age_years?: number) {
  const elderly = age_years !== undefined && age_years >= 65;
  const factor = sex === "male" ? (elderly ? 0.5 : 0.6) : (elderly ? 0.45 : 0.5);
  return round(weight_kg * factor, 2);
}

export function adrogueMadiasDeltaNaPerL(serumNa_mEq_L: number, infusateNa_mEq_L: number, weight_kg: number, sex: Sex, age_years?: number) {
  const TBW = tbwEstimate(weight_kg, sex, age_years);
  const delta = (infusateNa_mEq_L - serumNa_mEq_L) / (TBW + 1);
  return { TBW_L: TBW, predicted_deltaNa_per_L: round(delta, 2) };
}

export function safeNaCorrectionPlanner(startNa_mEq_L: number, targetNa_mEq_L: number, hours: number) {
  const delta = targetNa_mEq_L - startNa_mEq_L;
  const ratePer24 = (delta / hours) * 24;
  const limit24 = 8; // conservative default
  const limit48 = 18;
  return {
    planned_delta_mEq: round(delta, 2),
    projected_24h_rate_mEq: round(ratePer24, 2),
    exceeds_24h_limit: ratePer24 > limit24,
    guardrails: { limit_24h_mEq: limit24, limit_48h_mEq: limit48 }
  };
}
