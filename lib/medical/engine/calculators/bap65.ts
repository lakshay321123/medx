
// lib/medical/engine/calculators/bap65.ts
// BAP-65 for AECOPD disposition: BUN>=25, Altered mental status, Pulse>=109, Age>=65.

export interface BAP65Input {
  bun_mg_dL?: number | null;
  altered_mental_status?: boolean | null;
  pulse_bpm?: number | null;
  age_years?: number | null;
}

export interface BAP65Output { points: number; class_label: "I"|"II"|"III"|"IV"; components: Record<string, number>; }

export function runBAP65(i: BAP65Input): BAP65Output {
  const comp: Record<string, number> = {};
  comp.bun = (i.bun_mg_dL ?? 0) >= 25 ? 1 : 0;
  comp.ams = i.altered_mental_status ? 1 : 0;
  comp.pulse = (i.pulse_bpm ?? 0) >= 109 ? 1 : 0;
  comp.age = (i.age_years ?? 0) >= 65 ? 1 : 0;
  const pts = Object.values(comp).reduce((a,b)=>a+b,0);
  let cls: "I"|"II"|"III"|"IV" = "I";
  if (pts === 1) cls = "II"; else if (pts === 2) cls = "III"; else if (pts >= 3) cls = "IV";
  return { points: pts, class_label: cls, components: comp };
}
