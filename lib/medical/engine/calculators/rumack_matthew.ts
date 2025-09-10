
// lib/medical/engine/calculators/rumack_matthew.ts
// Treatment ("150") line approximation: threshold(t) = 150 * 2^((4 - t)/4), for t in [4,24] hours.
// Returns whether the patient's acetaminophen level is ABOVE the treatment line (start NAC).

export interface RumackInput {
  hours_since_ingestion: number;      // hours
  acetaminophen_level_ug_mL: number;  // µg/mL (a.k.a. mg/L)
}

export interface RumackOutput {
  threshold_ug_mL: number | null;
  above_treatment_line: boolean | null;
  interpretable: boolean;
}

function thresholdAtHours(t:number): number | null {
  if (t < 4 || t > 24) return null;
  // Every 4 hours beyond 4h halves the threshold (approximate half-life line).
  const pow = (4 - t) / 4.0;
  return 150 * Math.pow(2, pow);
}

export function runRumackMatthew(i: RumackInput): RumackOutput {
  const thr = thresholdAtHours(i.hours_since_ingestion);
  if (thr === null) return { threshold_ug_mL: null, above_treatment_line: null, interpretable: false };
  return { threshold_ug_mL: thr, above_treatment_line: i.acetaminophen_level_ug_mL >= thr, interpretable: true };
}
