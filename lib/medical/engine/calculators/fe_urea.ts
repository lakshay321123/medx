/**
 * Fractional Excretion of Urea (FeUrea %):
 * FeUrea = (UUrea * Pcr) / (PUrea * Ucr) * 100
 */
export interface FeUreaInput {
  urine_urea_mg_dl: number;
  plasma_urea_mg_dl: number;
  urine_cr_mg_dl: number;
  plasma_cr_mg_dl: number;
}
export interface FeUreaResult {
  feu_percent: number;
}
export function runFeUrea(i: FeUreaInput): FeUreaResult {
  const feu = (i.urine_urea_mg_dl * i.plasma_cr_mg_dl) / (i.plasma_urea_mg_dl * i.urine_cr_mg_dl) * 100;
  return { feu_percent: feu };
}
