
// lib/medical/engine/calculators/aims65.ts
// AIMS65 for upper GI bleed: Albumin <3.0, INR >1.5, altered mental status, SBP ≤90, age ≥65.

export interface AIMS65Input {
  albumin_g_dL?: number | null;
  inr?: number | null;
  altered_mental_status?: boolean | null;
  sbp_mmHg?: number | null;
  age_years?: number | null;
}

export interface AIMS65Output { points: number; components: Record<string, number>; }

export function runAIMS65(i: AIMS65Input): AIMS65Output {
  const comp: Record<string, number> = {};
  comp.alb = (i.albumin_g_dL ?? 10) < 3.0 ? 1 : 0;
  comp.inr = (i.inr ?? 0) > 1.5 ? 1 : 0;
  comp.ams = i.altered_mental_status ? 1 : 0;
  comp.sbp = (i.sbp_mmHg ?? 200) <= 90 ? 1 : 0;
  comp.age = (i.age_years ?? 0) >= 65 ? 1 : 0;
  const pts = Object.values(comp).reduce((a,b)=>a+b,0);
  return { points: pts, components: comp };
}
