
// lib/medical/engine/calculators/pitt_bacteremia.ts

export interface PittInput {
  temp_c?: number | null;
  sbp_mmHg?: number | null;
  mechanical_ventilation?: boolean | null;
  cardiac_arrest?: boolean | null;
  mental_status?: "alert"|"disoriented"|"stupor"|"coma" | null;
}

export interface PittOutput {
  points: number;
  components: Record<string, number>;
}

function msPts(ms: PittInput["mental_status"]): number {
  if (ms === "coma") return 4;
  if (ms === "stupor") return 2;
  if (ms === "disoriented") return 1;
  return 0;
}

export function runPittBacteremia(i: PittInput): PittOutput {
  const comp: Record<string, number> = {};
  comp.temp = (i.temp_c ?? 37) < 35 ? 1 : 0;
  comp.hypotension = (i.sbp_mmHg ?? 120) < 90 ? 2 : 0;
  comp.mech_vent = i.mechanical_ventilation ? 2 : 0;
  comp.arrest = i.cardiac_arrest ? 4 : 0;
  comp.mental = msPts(i.mental_status ?? "alert");
  const points = Object.values(comp).reduce((a,b)=>a+b,0);
  return { points, components: comp };
}
