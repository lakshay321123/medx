/**
 * Pediatric Glasgow Coma Scale, 3–15
 * Caller supplies E, V, M component points already selected for child
 * (ranges differ by age, but total range remains 3–15).
 */
export interface PGCSInput { eye: 1|2|3|4; verbal: 1|2|3|4|5; motor: 1|2|3|4|5|6; }
export interface PGCSResult { total: number; }
export function runPediatricGCS(i: PGCSInput): PGCSResult {
  return { total: i.eye + i.verbal + i.motor };
}
