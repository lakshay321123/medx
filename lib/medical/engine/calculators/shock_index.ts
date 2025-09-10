/**
 * Shock Index = HR / SBP
 * Rough bands: <0.7 normal, 0.7–0.9 mild, 0.9–1.3 moderate, >1.3 severe
 */
export interface ShockIndexInput { hr_bpm: number; sbp_mmHg: number; }
export interface ShockIndexResult { index: number; band: "normal" | "mild" | "moderate" | "severe"; }
export function runShockIndex(i: ShockIndexInput): ShockIndexResult {
  const idx = i.hr_bpm / i.sbp_mmHg;
  let band: ShockIndexResult["band"] = "normal";
  if (idx > 1.3) band = "severe";
  else if (idx >= 0.9) band = "moderate";
  else if (idx >= 0.7) band = "mild";
  return { index: idx, band };
}
