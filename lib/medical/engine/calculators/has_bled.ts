/**
 * HAS-BLED 0–9
 * H: Hypertension
 * A: Abnormal renal (1) and liver (1)
 * S: Stroke
 * B: Bleeding history or predisposition
 * L: Labile INR
 * E: Elderly >65
 * D: Drugs (antiplatelet/NSAID) (1) and alcohol (1)
 */
export interface HASBLEDInput {
  htn: boolean;
  renal_abnormal: boolean;
  liver_abnormal: boolean;
  stroke: boolean;
  bleeding: boolean;
  labile_inr: boolean;
  age_gt_65: boolean;
  drugs: boolean;
  alcohol: boolean;
}
export interface HASBLEDResult { score: number; }
export function runHASBLED(i: HASBLEDInput): HASBLEDResult {
  let s = 0;
  if (i.htn) s += 1;
  if (i.renal_abnormal) s += 1;
  if (i.liver_abnormal) s += 1;
  if (i.stroke) s += 1;
  if (i.bleeding) s += 1;
  if (i.labile_inr) s += 1;
  if (i.age_gt_65) s += 1;
  if (i.drugs) s += 1;
  if (i.alcohol) s += 1;
  return { score: s };
}
