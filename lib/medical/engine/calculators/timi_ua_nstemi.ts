// lib/medical/engine/calculators/timi_ua_nstemi.ts
// TIMI risk score for UA or NSTEMI.

export interface TIMIUAInput {
  age_ge_65?: boolean | null;
  cad_risk_factors_ge_3?: boolean | null;
  known_cad_stenosis_ge_50?: boolean | null;
  aspirin_use_past_7d?: boolean | null;
  severe_angina_recent?: boolean | null; // 2 or more episodes in 24 h
  st_deviation_ge_0_5mm?: boolean | null;
  elevated_cardiac_markers?: boolean | null;
}

export interface TIMIUAOutput { points: number; }

export function runTIMI_UA_NSTEMI(i: TIMIUAInput): TIMIUAOutput {
  const pts =
    (i.age_ge_65?1:0)+
    (i.cad_risk_factors_ge_3?1:0)+
    (i.known_cad_stenosis_ge_50?1:0)+
    (i.aspirin_use_past_7d?1:0)+
    (i.severe_angina_recent?1:0)+
    (i.st_deviation_ge_0_5mm?1:0)+
    (i.elevated_cardiac_markers?1:0);
  return { points: pts };
}
