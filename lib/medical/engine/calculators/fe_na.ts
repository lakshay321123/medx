/**
 * Fractional Excretion of Sodium (FeNa %):
 * FeNa = (UNa * Pcr) / (PNa * Ucr) * 100
 */
export interface FeNaInput {
  urine_na_mEq_L: number;
  plasma_na_mEq_L: number;
  urine_cr_mg_dl: number;
  plasma_cr_mg_dl: number;
}
export interface FeNaResult {
  fena_percent: number;
}
export function runFeNa(i: FeNaInput): FeNaResult {
  const fena = (i.urine_na_mEq_L * i.plasma_cr_mg_dl) / (i.plasma_na_mEq_L * i.urine_cr_mg_dl) * 100;
  return { fena_percent: fena };
}
