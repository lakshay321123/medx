/**
 * Estimated urine osmolality (mOsm/kg):
 * 2*(UNa + UK) + Urea/2.8 + Glucose/18  (urea and glucose in mg/dL)
 */
export interface UOsmEstInput {
  urine_na_meq_l: number;
  urine_k_meq_l: number;
  urine_urea_mg_dl?: number;
  urine_glucose_mg_dl?: number;
}
export interface UOsmEstResult { estimated_uosm_mosm_kg: number; }
export function runUrineOsmolalityEstimate(i: UOsmEstInput): UOsmEstResult {
  const base = 2 * (i.urine_na_meq_l + i.urine_k_meq_l);
  const urea = (i.urine_urea_mg_dl ?? 0) / 2.8;
  const glucose = (i.urine_glucose_mg_dl ?? 0) / 18.0;
  return { estimated_uosm_mosm_kg: base + urea + glucose };
}
