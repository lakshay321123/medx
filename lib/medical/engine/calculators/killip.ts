// lib/medical/engine/calculators/killip.ts
// Killip-Kimball classification helper.

export type KillipClass = 1|2|3|4;

export interface KillipInput {
  rales_crackles_bases?: boolean | null;
  s3_gallop?: boolean | null;
  pulmonary_edema?: boolean | null;
  cardiogenic_shock?: boolean | null;
}

export interface KillipOutput { killip: KillipClass; }

export function runKillip(i: KillipInput): KillipOutput {
  if (i.cardiogenic_shock) return { killip: 4 };
  if (i.pulmonary_edema) return { killip: 3 };
  if (i.rales_crackles_bases || i.s3_gallop) return { killip: 2 };
  return { killip: 1 };
}
