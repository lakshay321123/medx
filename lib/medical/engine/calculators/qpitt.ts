
// lib/medical/engine/calculators/qpitt.ts
// qPitt: simplified 5-item version (0–5).

export interface QPittInput {
  temp_c?: number | null;       // <36°C
  sbp_mmHg?: number | null;     // <90 or on vasopressors (send boolean below)
  on_vasopressors?: boolean | null;
  mechanical_ventilation?: boolean | null;
  altered_mental_status?: boolean | null;
  cardiac_arrest?: boolean | null;
}

export interface QPittOutput { points: number; components: Record<string, number>; }

export function runQPitt(i: QPittInput): QPittOutput {
  const comp: Record<string, number> = {};
  comp.temp = (i.temp_c ?? 37) < 36 ? 1 : 0;
  comp.sbp_or_pressors = ((i.sbp_mmHg ?? 120) < 90 || !!i.on_vasopressors) ? 1 : 0;
  comp.mech_vent = i.mechanical_ventilation ? 1 : 0;
  comp.ams = i.altered_mental_status ? 1 : 0;
  comp.arrest = i.cardiac_arrest ? 1 : 0;
  const points = Object.values(comp).reduce((a,b)=>a+b,0);
  return { points, components: comp };
}
