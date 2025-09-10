// lib/medical/engine/calculators/scorten.ts
export interface SCORTENInput {
  age?: number | null;
  malignancy?: boolean | null;
  hr?: number | null;
  tbsa_epidermal_detachment_pct?: number | null;
  bun_mmol_l?: number | null;
  bicarbonate_mmol_l?: number | null;
  glucose_mmol_l?: number | null;
}
export interface SCORTENOutput { points: number; components: Record<string, number>; }

export function runSCORTEN(i: SCORTENInput): SCORTENOutput {
  const comp: Record<string, number> = {};
  comp.age = (i.age ?? 0) > 40 ? 1 : 0;
  comp.malignancy = i.malignancy ? 1 : 0;
  comp.hr = (i.hr ?? 0) > 120 ? 1 : 0;
  comp.tbsa = (i.tbsa_epidermal_detachment_pct ?? 0) > 10 ? 1 : 0;
  comp.bun = (i.bun_mmol_l ?? 0) > 10 ? 1 : 0;
  comp.hco3 = (i.bicarbonate_mmol_l ?? 99) < 20 ? 1 : 0;
  comp.glucose = (i.glucose_mmol_l ?? 0) > 14 ? 1 : 0;
  const points = Object.values(comp).reduce((a,b)=>a+b,0);
  return { points, components: comp };
}
