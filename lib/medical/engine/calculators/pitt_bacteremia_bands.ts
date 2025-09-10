
// lib/medical/engine/calculators/pitt_bacteremia_bands.ts
// Banding helper for Pitt bacteremia score (commonly: ≥4 associated with higher mortality).

export function pittBand(points: number): "low"|"higher" {
  return points >= 4 ? "higher" : "low";
}
