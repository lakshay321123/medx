
// lib/medical/engine/calculators/shock_asi_dsi.ts
// Age-Shock Index (ASI) = age * HR / SBP; Diastolic Shock Index (DSI) = HR / DBP.

export interface ShockIndexInput {
  age_years: number;
  heart_rate_bpm: number;
  sbp_mmHg: number;
  dbp_mmHg: number;
}

export interface ShockIndexOutput {
  asi: number;
  dsi: number;
  flags: { asi_high: boolean; dsi_high: boolean; };
}

export function runASI_DSI(i: ShockIndexInput): ShockIndexOutput {
  const asi = (i.age_years * i.heart_rate_bpm) / Math.max(1e-6, i.sbp_mmHg);
  const dsi = i.heart_rate_bpm / Math.max(1e-6, i.dbp_mmHg);
  // Heuristic flags (literature varies); expose booleans without hard thresholds.
  return { asi, dsi, flags: { asi_high: asi >= 50, dsi_high: dsi >= 1.4 } };
}
