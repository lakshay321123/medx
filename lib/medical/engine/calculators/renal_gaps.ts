// lib/medical/engine/calculators/renal_gaps.ts
import { round } from "./utils";

/** Urine anion gap: (Urine Na + Urine K) − Urine Cl (all in mEq/L). */
export function urineAnionGap(una_mEq_L: number, uk_mEq_L: number, ucl_mEq_L: number) {
  const uag = (una_mEq_L + uk_mEq_L) - ucl_mEq_L;
  return { urine_anion_gap_mEq_L: round(uag, 0) };
}

/** Urine osm gap = measured Uosm − calculated Uosm;
 *  Calculated Uosm ≈ 2*(UNa + UK) + Urea/2.8 + Glucose/18
 */
export function urineOsmGap(args: {
  u_osm_measured_mOsm_kg: number;
  una_mEq_L: number;
  uk_mEq_L: number;
  urea_mg_dL?: number | null;
  glucose_mg_dL?: number | null;
}) {
  const urea = (args.urea_mg_dL ?? 0) / 2.8;
  const glucose = (args.glucose_mg_dL ?? 0) / 18;
  const calc = 2 * (args.una_mEq_L + args.uk_mEq_L) + urea + glucose;
  const gap = args.u_osm_measured_mOsm_kg - calc;
  return { urine_osm_calc_mOsm_kg: round(calc, 1), urine_osm_gap_mOsm_kg: round(gap, 1) };
}

/** Generic fractional excretion helper: FE(%) = (U_x * P_cr) / (P_x * U_cr) * 100 */
export function FE_generic(urine_x: number, plasma_x: number, urine_cr: number, plasma_cr: number) {
  const fe = (urine_x * plasma_cr) / Math.max(plasma_x * urine_cr, 1e-9) * 100;
  return { FE_percent: round(fe, 1) };
}

export const FENa = (uNa: number, pNa: number, uCr: number, pCr: number) => FE_generic(uNa, pNa, uCr, pCr);
export const FECl = (uCl: number, pCl: number, uCr: number, pCr: number) => FE_generic(uCl, pCl, uCr, pCr);
export const FEUrea = (uUrea_mg_dL: number, pBUN_mg_dL: number, uCr: number, pCr: number) =>
  FE_generic(uUrea_mg_dL, pBUN_mg_dL, uCr, pCr); // uses mg/dL consistently

export const FEPhos = (uPhos_mg_dL: number, pPhos_mg_dL: number, uCr: number, pCr: number) =>
  FE_generic(uPhos_mg_dL, pPhos_mg_dL, uCr, pCr);

export const FEMg = (uMg_mg_dL: number, pMg_mg_dL: number, uCr: number, pCr: number) =>
  FE_generic(uMg_mg_dL, pMg_mg_dL, uCr, pCr);
