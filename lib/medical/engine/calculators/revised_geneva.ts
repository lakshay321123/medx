/**
 * Revised Geneva score (2006) for PE probability.
 * Points (per Le Gal et al. and common references):
 *  Age > 65: +1
 *  Previous DVT/PE: +3
 *  Surgery under GA or lower limb fracture within 1 month: +2
 *  Active malignancy: +2
 *  Unilateral lower-limb pain: +3
 *  Hemoptysis: +2
 *  Heart rate 75–94: +3; >=95: +5
 *  Pain on deep venous palpation AND unilateral edema: +4
 * Bands: 0–3 low, 4–10 intermediate, >=11 high.
 */
export interface GenevaInput {
  age_gt_65: boolean;
  previous_vte: boolean;
  surgery_or_fracture_past_month: boolean;
  active_cancer: boolean;
  unilateral_leg_pain: boolean;
  hemoptysis: boolean;
  heart_rate: number;
  pain_on_dvp_and_unilateral_edema: boolean;
}
export interface GenevaResult {
  total: number;
  band: "low"|"intermediate"|"high";
}
export function revisedGeneva(i: GenevaInput): GenevaResult {
  let total = 0;
  total += i.age_gt_65 ? 1 : 0;
  total += i.previous_vte ? 3 : 0;
  total += i.surgery_or_fracture_past_month ? 2 : 0;
  total += i.active_cancer ? 2 : 0;
  total += i.unilateral_leg_pain ? 3 : 0;
  total += i.hemoptysis ? 2 : 0;
  if (i.heart_rate >= 95) total += 5;
  else if (i.heart_rate >= 75) total += 3;
  total += i.pain_on_dvp_and_unilateral_edema ? 4 : 0;
  const band = (total <= 3) ? "low" : (total <= 10) ? "intermediate" : "high";
  return { total, band };
}
