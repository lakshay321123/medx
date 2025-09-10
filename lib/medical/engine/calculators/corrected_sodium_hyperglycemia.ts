// lib/medical/engine/calculators/corrected_sodium_hyperglycemia.ts
export interface CorrectedNaInput {
  measured_na_mmol_l?: number | null;
  glucose_mg_dl?: number | null;
}
export interface CorrectedNaOutput { corrected_na_mmol_l: number; }

export function runCorrectedNaHyperglycemia(i: CorrectedNaInput): CorrectedNaOutput {
  const na = i.measured_na_mmol_l ?? NaN;
  const glu = i.glucose_mg_dl ?? 100;
  // Traditional: +1.6 mEq/L per 100 mg/dL >100 ; Modern: up to 2.4 — we use 1.6 here.
  const correction = Math.max(0, (glu - 100)) * 1.6 / 100;
  return { corrected_na_mmol_l: na + correction };
}
