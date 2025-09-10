/**
 * PRAM 0–12 (requires categorical scoring for 5 items)
 * Inputs should be raw category points for:
 * - Suprasternal retractions (0–2)
 * - Scalene muscle use (0–2)
 * - Air entry (0–3)
 * - Wheeze (0–3)
 * - O2 saturation (0–2)
 * Risk: 0–3 mild, 4–7 moderate, 8–12 severe
 */
export interface PRAMInput {
  suprasternal_ret: 0|1|2;
  scalene_use: 0|1|2;
  air_entry: 0|1|2|3;
  wheeze: 0|1|2|3;
  o2_sat: 0|1|2;
}
export interface PRAMResult { score: number; severity: "mild" | "moderate" | "severe"; }
export function runPRAM(i: PRAMInput): PRAMResult {
  const s = i.suprasternal_ret + i.scalene_use + i.air_entry + i.wheeze + i.o2_sat;
  let sev: PRAMResult["severity"] = "mild";
  if (s >= 8) sev = "severe";
  else if (s >= 4) sev = "moderate";
  return { score: s, severity: sev };
}
