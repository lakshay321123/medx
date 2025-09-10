/**
 * Free Water Deficit:
 * FWD = TBW * ((Na_measured / Na_desired) - 1)
 * Commonly Na_desired = 140 mEq/L
 * TBW: male ~0.6 * weight(kg), female ~0.5; elderly may use 0.5/0.45
 */
export interface FWDInput {
  sex: "male" | "female";
  age?: number;
  weight_kg: number;
  na_measured: number;
  na_desired?: number; // default 140
  tbw_factor_override?: number; // optional explicit TBW factor
}
export interface FWDResult {
  tbw_l: number;
  fwd_l: number;
}
export function runFreeWaterDeficit(i: FWDInput): FWDResult {
  const desired = i.na_desired ?? 140;

  // Determine TBW factor (override > age/sex defaults)
  let factor: number;
  if (i.tbw_factor_override != null) {
    factor = i.tbw_factor_override;
  } else {
    const elderly = (i.age ?? 0) >= 65;
    if (i.sex === "male") factor = elderly ? 0.5 : 0.6;
    else factor = elderly ? 0.45 : 0.5;
  }

  const tbw = factor * i.weight_kg;
  const fwd = tbw * ((i.na_measured / desired) - 1);
  return { tbw_l: tbw, fwd_l: fwd };
}
