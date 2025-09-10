/**
 * Urine Anion Gap (UAG):
 * UAG = UNa + UK - UCl (mEq/L)
 */
export interface UAGInput {
  urine_na: number;
  urine_k: number;
  urine_cl: number;
}
export interface UAGResult {
  uag: number;
}
export function runUrineAnionGap(i: UAGInput): UAGResult {
  return { uag: i.urine_na + i.urine_k - i.urine_cl };
}
