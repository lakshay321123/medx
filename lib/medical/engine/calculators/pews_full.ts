/**
 * Pediatric Early Warning Score (simplified), 0–19
 * Caller passes pre-scored category points:
 * - respiratory_score (0–3)
 * - cardiovascular_score (0–3)
 * - behavior_score (0–3)
 * - sats_score (0–3)
 * - o2_supplemental (boolean adds 2)
 * - urine_output_low (boolean adds 2)
 * Risk: 0–2 low, 3–5 medium, >=6 high
 */
export interface PEWSInput {
  respiratory_score: 0|1|2|3;
  cardiovascular_score: 0|1|2|3;
  behavior_score: 0|1|2|3;
  sats_score: 0|1|2|3;
  o2_supplemental?: boolean;
  urine_output_low?: boolean;
}
export interface PEWSResult { score: number; risk: "low" | "medium" | "high"; }
export function runPEWS(i: PEWSInput): PEWSResult {
  let s = i.respiratory_score + i.cardiovascular_score + i.behavior_score + i.sats_score;
  if (i.o2_supplemental) s += 2;
  if (i.urine_output_low) s += 2;
  let risk: PEWSResult["risk"] = "low";
  if (s >= 6) risk = "high";
  else if (s >= 3) risk = "medium";
  return { score: s, risk };
}
