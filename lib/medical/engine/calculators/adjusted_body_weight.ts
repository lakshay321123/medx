/**
 * Adjusted Body Weight (AdjBW) for obesity dosing:
 * AdjBW = IBW + 0.4*(Actual - IBW)
 */
export interface AdjBWInput {
  ibw_kg: number;
  actual_kg: number;
  factor?: number; // default 0.4
}
export interface AdjBWResult { adjbw_kg: number; }
export function runAdjustedBodyWeight(i: AdjBWInput): AdjBWResult {
  const f = i.factor ?? 0.4;
  return { adjbw_kg: i.ibw_kg + f*(i.actual_kg - i.ibw_kg) };
}
