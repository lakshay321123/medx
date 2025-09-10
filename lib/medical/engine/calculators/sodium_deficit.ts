/**
 * Sodium Deficit for hyponatremia correction:
 * Deficit (mEq) = TBW * (targetNa - currentNa)
 * TBW similar to free water calc: male 0.6, female 0.5 (elderly 0.5/0.45)
 */
export interface NaDeficitInput {
  sex: "male" | "female";
  age?: number;
  weight_kg: number;
  current_na: number;
  target_na: number;
  tbw_factor_override?: number;
}
export interface NaDeficitResult {
  tbw_l: number;
  deficit_meq: number;
}
export function runSodiumDeficit(i: NaDeficitInput): NaDeficitResult {
  let factor: number;
  if (i.tbw_factor_override != null) factor = i.tbw_factor_override;
  else {
    const elderly = (i.age ?? 0) >= 65;
    if (i.sex === "male") factor = elderly ? 0.5 : 0.6;
    else factor = elderly ? 0.45 : 0.5;
  }
  const tbw = factor * i.weight_kg;
  const deficit = tbw * (i.target_na - i.current_na);
  return { tbw_l: tbw, deficit_meq: deficit };
}
