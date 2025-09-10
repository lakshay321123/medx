// lib/medical/engine/calculators/gcs.ts
export interface GCSInput { eye?: number | null; verbal?: number | null; motor?: number | null; }
export interface GCSOutput { total: number; severity: "mild"|"moderate"|"severe"; }

export function runGCS(i: GCSInput): GCSOutput {
  const e = i.eye ?? 1, v = i.verbal ?? 1, m = i.motor ?? 1;
  const total = e + v + m;
  let severity: GCSOutput["severity"] = "mild";
  if (total <= 8) severity = "severe";
  else if (total <= 12) severity = "moderate";
  return { total, severity };
}
