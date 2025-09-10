
// lib/medical/engine/calculators/urine_gaps.ts

export interface UrineGapsInput {
  urine_na_mEq_L?: number | null;
  urine_k_mEq_L?: number | null;
  urine_cl_mEq_L?: number | null;
  urine_osm_measured_mOsm_kg?: number | null;
  urine_urea_mg_dL?: number | null;
  urine_glucose_mg_dL?: number | null;
}

export interface UrineGapsOutput {
  urine_anion_gap_mEq_L: number | null;
  urine_osm_gap_mOsm_kg: number | null;
  calc_urine_osm_mOsm_kg: number | null;
}

export function runUrineGaps(i: UrineGapsInput): UrineGapsOutput {
  const na = i.urine_na_mEq_L ?? null;
  const k  = i.urine_k_mEq_L ?? null;
  const cl = i.urine_cl_mEq_L ?? null;
  const uosm = i.urine_osm_measured_mOsm_kg ?? null;
  const uurea = i.urine_urea_mg_dL ?? 0;
  const ug = i.urine_glucose_mg_dL ?? 0;

  const uag = (na!==null && k!==null && cl!==null) ? ((na + k) - cl) : null;
  const calcUOsm = (na!==null && k!==null) ? (2*(na + k) + (uurea/2.8) + (ug/18)) : null;
  const uog = (uosm!==null && calcUOsm!==null) ? (uosm - calcUOsm) : null;
  return { urine_anion_gap_mEq_L: uag, urine_osm_gap_mOsm_kg: uog, calc_urine_osm_mOsm_kg: calcUOsm };
}
