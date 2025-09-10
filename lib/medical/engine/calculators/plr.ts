/**
 * Platelet to Lymphocyte Ratio
 */
export interface PLRInput { platelets_abs: number; lymphocytes_abs: number; }
export interface PLRResult { ratio: number; }
export function runPLR(i: PLRInput): PLRResult {
  return { ratio: i.platelets_abs / i.lymphocytes_abs };
}
