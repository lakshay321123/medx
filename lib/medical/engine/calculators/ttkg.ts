/**
 * Transtubular Potassium Gradient (TTKG):
 * TTKG = (UrineK * PlasmaOsm) / (PlasmaK * UrineOsm)
 */
export interface TTKGInput {
  urine_k_meq_l: number;
  plasma_k_meq_l: number;
  urine_osm_mosm_kg: number;
  plasma_osm_mosm_kg: number;
}
export interface TTKGResult { ttkg: number; }
export function runTTKG(i: TTKGInput): TTKGResult {
  const value = (i.urine_k_meq_l * i.plasma_osm_mosm_kg) / (i.plasma_k_meq_l * i.urine_osm_mosm_kg);
  return { ttkg: value };
}
