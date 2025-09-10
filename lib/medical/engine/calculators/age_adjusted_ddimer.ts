/**
 * Age-adjusted D-dimer threshold (FEU ng/mL)
 * Age >=50: threshold = age * 10; Age <50: threshold = 500
 */
export interface AgeAdjDDimerInput { age: number; }
export interface AgeAdjDDimerResult { threshold_feu_ng_ml: number; }
export function runAgeAdjustedDDimer(i: AgeAdjDDimerInput): AgeAdjDDimerResult {
  const thr = i.age >= 50 ? i.age * 10 : 500;
  return { threshold_feu_ng_ml: thr };
}
