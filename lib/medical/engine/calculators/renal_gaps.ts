import { round } from "./utils";

export function urineAnionGap(uNa_mEq_L: number, uK_mEq_L: number, uCl_mEq_L: number) {
  const uag = (uNa_mEq_L + uK_mEq_L) - uCl_mEq_L;
  return { urine_anion_gap_mEq_L: round(uag, 1) };
}

export function urineOsmGap(params: { measured_mOsm_kg: number, uNa_mEq_L: number, uK_mEq_L: number, uUrea_mg_dL?: number, uGlucose_mg_dL?: number }) {
  const { measured_mOsm_kg, uNa_mEq_L, uK_mEq_L, uUrea_mg_dL = 0, uGlucose_mg_dL = 0 } = params;
  const calc = 2 * (uNa_mEq_L + uK_mEq_L) + (uUrea_mg_dL / 2.8) + (uGlucose_mg_dL / 18);
  const gap = measured_mOsm_kg - calc;
  return { urine_osm_gap_mOsm_kg: round(gap, 1) };
}

export function FEPhos(pSerumPhos_mg_dL: number, pSerumCr_mg_dL: number, uPhos_mg_dL: number, uCr_mg_dL: number) {
  const fe = ((uPhos_mg_dL * pSerumCr_mg_dL) / (pSerumPhos_mg_dL * uCr_mg_dL)) * 100;
  return { FEPhos_percent: round(fe, 1) };
}

export function FEMg(pSerumMg_mg_dL: number, pSerumCr_mg_dL: number, uMg_mg_dL: number, uCr_mg_dL: number) {
  const fe = ((uMg_mg_dL * pSerumCr_mg_dL) / (pSerumMg_mg_dL * uCr_mg_dL)) * 100;
  return { FEMg_percent: round(fe, 1) };
}
