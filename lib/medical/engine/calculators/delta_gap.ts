/**
 * Delta Gap (Delta-Delta) for mixed acid-base:
 * deltaAG = (AG - 12)
 * deltaHCO3 = (24 - HCO3)
 * ratio = deltaAG / deltaHCO3
 */
export interface DeltaGapInput {
  anion_gap: number;
  hco3: number;
}
export interface DeltaGapResult {
  delta_ag: number;
  delta_hco3: number;
  ratio: number | null;
  interpretation: string;
}
export function runDeltaGap(i: DeltaGapInput): DeltaGapResult {
  const delta_ag = i.anion_gap - 12;
  const delta_hco3 = 24 - i.hco3;
  const ratio = (delta_hco3 === 0) ? null : delta_ag / delta_hco3;
  let interp = "indeterminate";
  if (ratio != null) {
    if (ratio < 0.8) interp = "concurrent non-anion gap metabolic acidosis likely";
    else if (ratio <= 2.0) interp = "pure high anion gap metabolic acidosis likely";
    else interp = "concurrent metabolic alkalosis or chronic respiratory acidosis likely";
  }
  return { delta_ag, delta_hco3, ratio, interpretation: interp };
}
