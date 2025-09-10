// lib/medical/engine/calculators/bap65.ts
// BAP-65 score for AECOPD disposition risk
// Criteria: BUN ≥25 mg/dL, Altered mental status, Pulse ≥110 bpm, Age ≥65 years
// Points: 1 per criterion (0–4). Risk groups: A=0, B=1, C=2, D=3–4.

export interface BAP65Input {
  bun_mg_dL?: number | null;
  altered_mental_status?: boolean | null;
  pulse_bpm?: number | null;
  age_years?: number | null;
}

export type BAP65Group = "A" | "B" | "C" | "D";

export interface BAP65Output {
  points: number;              // 0–4
  group: BAP65Group;           // A/B/C/D
  flags: {
    bun_ge_25: boolean;
    ams: boolean;
    pulse_ge_110: boolean;
    age_ge_65: boolean;
  };
}

/** Compute BAP-65 score for AECOPD */
export function runBAP65(i: BAP65Input): BAP65Output {
  const bun_ge_25 = (i.bun_mg_dL ?? -Infinity) >= 25;
  const ams = !!i.altered_mental_status;
  const pulse_ge_110 = (i.pulse_bpm ?? -Infinity) >= 110;
  const age_ge_65 = (i.age_years ?? -Infinity) >= 65;

  const points =
    (bun_ge_25 ? 1 : 0) +
    (ams ? 1 : 0) +
    (pulse_ge_110 ? 1 : 0) +
    (age_ge_65 ? 1 : 0);

  let group: BAP65Group = "A";
  if (points === 1) group = "B";
  else if (points === 2) group = "C";
  else if (points >= 3) group = "D";

  return {
    points,
    group,
    flags: { bun_ge_25, ams, pulse_ge_110, age_ge_65 },
  };
}
