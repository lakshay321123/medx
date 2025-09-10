import { round } from "./utils";

export interface LactateInput {
  lactate_initial_mmol_L: number;
  lactate_followup_mmol_L: number;
}

export interface LactateClearance {
  clearance_percent: number;
  improved: boolean;
}

export function runLactateClearance(i: LactateInput): LactateClearance {
  const { lactate_initial_mmol_L: L0, lactate_followup_mmol_L: L1 } = i;
  const clearance = (L0 > 0) ? ((L0 - L1) / L0) * 100 : NaN;
  return { clearance_percent: round(clearance, 1), improved: isFinite(clearance) && clearance >= 10 };
}
