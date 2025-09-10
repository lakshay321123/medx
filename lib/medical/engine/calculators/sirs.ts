// lib/medical/engine/calculators/sirs.ts
export interface SIRSInput {
  temp_c?: number | null;
  hr?: number | null;
  rr?: number | null;
  paco2_mmHg?: number | null;
  wbc_k?: number | null; // x10^9/L
  bands_pct?: number | null;
}
export interface SIRSOutput { count: number; criteria: string[]; }

export function runSIRS(i: SIRSInput): SIRSOutput {
  const crit: string[] = [];
  if (i.temp_c != null && (i.temp_c > 38 || i.temp_c < 36)) crit.push("temperature");
  if ((i.hr ?? 0) > 90) crit.push("HR");
  if ((i.rr ?? 0) > 20 || (i.paco2_mmHg != null && i.paco2_mmHg < 32)) crit.push("RR/PaCO2");
  if (i.wbc_k != null && (i.wbc_k > 12 || i.wbc_k < 4)) crit.push("WBC");
  if ((i.bands_pct ?? 0) > 10) crit.push("Bands");
  return { count: crit.length, criteria: crit };
}
