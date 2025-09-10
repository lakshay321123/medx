/**
 * Lactate clearance percent
 * Clearance = ((initial - subsequent) / initial) * 100
 */
export interface LactateClearanceInput { initial_mmol_l: number; subsequent_mmol_l: number; }
export interface LactateClearanceResult { clearance_percent: number; }
export function runLactateClearance(i: LactateClearanceInput): LactateClearanceResult {
  return { clearance_percent: ((i.initial_mmol_l - i.subsequent_mmol_l) / i.initial_mmol_l) * 100 };
}
