/**
 * Body Surface Area (Mosteller):
 * BSA (m^2) = sqrt( (height_cm * weight_kg) / 3600 )
 */
export interface BSAInput {
  height_cm: number;
  weight_kg: number;
}
export interface BSAResult { bsa_m2: number; }
export function runBSAMosteller(i: BSAInput): BSAResult {
  return { bsa_m2: Math.sqrt((i.height_cm * i.weight_kg)/3600) };
}
