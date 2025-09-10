// lib/medical/engine/calculators/heart_score.ts
// HEART score for chest pain risk stratification.

export interface HEARTInput {
  history_level?: 0|1|2 | null;   // 0 slight, 1 moderate, 2 highly suspicious
  ecg_level?: 0|1|2 | null;       // 0 normal, 1 nonspecific repolarization, 2 significant ST deviation
  age_years?: number | null;
  risk_factors_count?: number | null; // number of traditional RFs or hx CAD
  troponin_multiple_of_uln?: number | null; // 0 means normal
}

export interface HEARTOutput { points: number; components: Record<string, number>; }

export function runHEART(i: HEARTInput): HEARTOutput {
  const comp: Record<string, number> = {};
  comp.history = i.history_level ?? 0;
  comp.ecg = i.ecg_level ?? 0;
  const age = i.age_years ?? 0;
  comp.age = age >= 65 ? 2 : (age >= 45 ? 1 : 0);
  const rf = i.risk_factors_count ?? 0;
  comp.risk = rf >= 3 ? 2 : (rf >= 1 ? 1 : 0);
  const tro = i.troponin_multiple_of_uln ?? 0;
  comp.trop = tro > 3 ? 2 : (tro > 1 ? 1 : 0);
  const pts = Object.values(comp).reduce((a,b)=>a+b,0);
  return { points: pts, components: comp };
}
