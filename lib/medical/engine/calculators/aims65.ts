/**
 * AIMS65 for upper GI bleeding (0–5)
 * Albumin < 3.0 g/dL, INR > 1.5, Altered mental status, SBP <= 90, Age >= 65
 */
export interface AIMS65Input {
  albumin_g_dl: number;
  inr: number;
  altered_mental_status: boolean;
  sbp_mmHg: number;
  age: number;
}
export interface AIMS65Result { score: number; }
export function runAIMS65(i: AIMS65Input): AIMS65Result {
  let s = 0;
  if (i.albumin_g_dl < 3.0) s += 1;
  if (i.inr > 1.5) s += 1;
  if (i.altered_mental_status) s += 1;
  if (i.sbp_mmHg <= 90) s += 1;
  if (i.age >= 65) s += 1;
  return { score: s };
}
