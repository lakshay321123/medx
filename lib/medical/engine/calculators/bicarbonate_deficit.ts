/**
 * Bicarbonate Deficit (approx):
 * Deficit (mEq) = factor * weight_kg * (desired_hco3 - current_hco3)
 * Common factor 0.5 for adults (ECF distribution)
 */
export interface BicarbDeficitInput {
  weight_kg: number;
  current_hco3: number;
  desired_hco3: number; // e.g., 22
  factor?: number; // default 0.5
}
export interface BicarbDeficitResult {
  deficit_meq: number;
}
export function runBicarbonateDeficit(i: BicarbDeficitInput): BicarbDeficitResult {
  const factor = i.factor ?? 0.5;
  const deficit = factor * i.weight_kg * (i.desired_hco3 - i.current_hco3);
  return { deficit_meq: deficit };
}
