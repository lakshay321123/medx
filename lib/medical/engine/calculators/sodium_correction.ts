// lib/medical/engine/calculators/sodium_correction.ts

export interface SodiumCorrectionPlan {
  start_na_mEq_L: number;
  target_na_mEq_L_24h: number;
  high_risk_osmotic_dem?: boolean | null; // alcoholism, malnutrition, advanced liver disease, hypokalemia
}

export interface SodiumCorrectionOutput {
  delta_24h: number;
  allowed_max_24h: number; // 6 if high-risk else 8
  within_safe_24h: boolean;
}

export function checkSodiumCorrection(p: SodiumCorrectionPlan): SodiumCorrectionOutput {
  const delta = (p.target_na_mEq_L_24h - p.start_na_mEq_L);
  const max24 = (p.high_risk_osmotic_dem ? 6 : 8);
  return { delta_24h: delta, allowed_max_24h: max24, within_safe_24h: delta <= max24 };
}
