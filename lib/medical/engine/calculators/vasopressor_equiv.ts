import { round } from "./utils";

/**
 * Approximate norepinephrine-equivalents (µg/kg/min).
 * Notes: mappings vary by source; use clinically with caution.
 * Epi ≈ NE; Dopamine/150; Phenylephrine/100; Vasopressin 0.03 U/min ≈ 0.1 NE-eq.
 */
export function norepiEquivalent(params: { 
  norepi?: number, epi?: number, dopa?: number, phenyl?: number, dobut?: number, 
  vasopressin_U_min?: number 
}) {
  const ne = params.norepi ?? 0;
  const epi = params.epi ?? 0;
  const dopa = params.dopa ? (params.dopa / 150) : 0;
  const phenyl = params.phenyl ? (params.phenyl / 100) : 0;
  const vaso = params.vasopressin_U_min ? (params.vasopressin_U_min * (0.1/0.03)) : 0; // 0.03 U/min ≈ 0.1 NE-eq
  const total = ne + epi + dopa + phenyl + vaso;
  return { norepi_eq_ug_kg_min: round(total, 3) };
}
