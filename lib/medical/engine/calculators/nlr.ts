/**
 * Neutrophil to Lymphocyte Ratio
 */
export interface NLRInput { neutrophils_abs: number; lymphocytes_abs: number; }
export interface NLRResult { ratio: number; }
export function runNLR(i: NLRInput): NLRResult {
  return { ratio: i.neutrophils_abs / i.lymphocytes_abs };
}
