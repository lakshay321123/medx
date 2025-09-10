
// lib/medical/engine/calculators/orbit_bleed.ts
// ORBIT bleeding risk score for AF patients on anticoagulation (simple implementation).

export interface ORBITInput {
  age_ge_75: boolean;          // 1
  anemia_or_low_hb?: boolean;  // 2
  bleeding_history?: boolean;  // 2
  egfr_lt_60?: boolean;        // 1
  antiplatelet_therapy?: boolean; // 1
}

export type ORBITBand = "low"|"intermediate"|"high";

export interface ORBITOutput { points: number; band: ORBITBand; components: Record<string, number>; }

export function orbit(i: ORBITInput): ORBITOutput {
  const comp: Record<string, number> = {};
  comp.age = i.age_ge_75 ? 1 : 0;
  comp.anemia = i.anemia_or_low_hb ? 2 : 0;
  comp.bleeding_hx = i.bleeding_history ? 2 : 0;
  comp.ckd = i.egfr_lt_60 ? 1 : 0;
  comp.antiplatelet = i.antiplatelet_therapy ? 1 : 0;
  const points = Object.values(comp).reduce((a,b)=>a+b,0);
  let band: ORBITBand = "low";
  if (points >= 4) band = "high";
  else if (points === 3) band = "intermediate";
  return { points, band, components: comp };
}
