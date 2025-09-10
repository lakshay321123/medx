// lib/medical/engine/calculators/parkland.ts
export interface ParklandInput {
  weight_kg?: number | null;
  tbsa_percent?: number | null;
  hours_since_burn?: number | null; // to guide remaining in 8h window
}
export interface ParklandOutput { total_ml_24h: number; first8h_ml: number; next16h_ml: number; remaining_first8h_ml?: number | null; }

export function runParkland(i: ParklandInput): ParklandOutput {
  const w = i.weight_kg ?? 0, tbsa = i.tbsa_percent ?? 0;
  const total = 4 * w * tbsa; // mL
  const first8 = total / 2;
  const next16 = total - first8;
  let remaining: number | null = null;
  if (i.hours_since_burn != null) {
    const elapsed = Math.max(0, Math.min(8, i.hours_since_burn));
    remaining = first8 * (1 - elapsed/8);
  }
  return { total_ml_24h: total, first8h_ml: first8, next16h_ml: next16, remaining_first8h_ml: remaining };
}
