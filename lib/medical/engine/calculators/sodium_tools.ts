
// lib/medical/engine/calculators/sodium_tools.ts
// TBW calculator, Adrogué–Madias ΔNa/L prediction, and safe correction guardrails.

export type Sex = "male"|"female";

export interface TBWInput {
  weight_kg: number;
  sex: Sex;
  age_years?: number;
  factor_override?: number; // if provided, overrides default factors
}

export function tbwLiters(i: TBWInput): number {
  if (!isFinite(i.weight_kg) || i.weight_kg <= 0) return NaN;
  if (i.factor_override && i.factor_override > 0) return i.weight_kg * i.factor_override;
  const age = i.age_years ?? 40;
  // Simple, common clinical factors
  const factor = (i.sex === "male")
    ? (age >= 65 ? 0.5 : 0.6)
    : (age >= 65 ? 0.45 : 0.5);
  return i.weight_kg * factor;
}

export function adrogueMadiasDeltaNaPerL(serumNa_mEqL: number, infusateNa_mEqL: number, tbw_L: number): number {
  if (!isFinite(serumNa_mEqL) || !isFinite(infusateNa_mEqL) || !isFinite(tbw_L) || tbw_L <= 0) return NaN;
  return (infusateNa_mEqL - serumNa_mEqL) / (tbw_L + 1.0);
}

export interface NaCorrectionPlanInput {
  currentNa_mEqL: number;
  proposedRise_24h_mEq: number;
  high_risk_ods?: boolean; // malnutrition, alcoholism, advanced liver dz, hypokalemia
}

export interface NaCorrectionPlanOutput {
  max_allowed_24h_mEq: number;  // guardrail (default 8; 6 if high risk)
  clampedRise_24h_mEq: number;  // proposedRise clamped to guardrail
  proposed_rate_mEq_per_h: number;
  warning: string | null;
}

export function planNaCorrection(i: NaCorrectionPlanInput): NaCorrectionPlanOutput {
  const max_allowed = i.high_risk_ods ? 6 : 8;
  const clamped = Math.min(Math.max(i.proposedRise_24h_mEq, 0), max_allowed);
  const rate = clamped / 24.0;
  const warn = (i.proposedRise_24h_mEq > max_allowed)
    ? `Proposed rise exceeds guardrail (${max_allowed} mEq/L/24h)`
    : null;
  return { max_allowed_24h_mEq: max_allowed, clampedRise_24h_mEq: clamped, proposed_rate_mEq_per_h: rate, warning: warn };
}
