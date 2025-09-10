/**
 * Wells PE score
 * Points: DVT signs 3, PE most likely 3, HR>100 1.5, immobilization/surgery 1.5, previous DVT/PE 1.5, hemoptysis 1, cancer 1
 * Bands: >6 high, 2–6 moderate, <2 low; Also likely if >4
 */
export interface WellsPEInput {
  dvt_signs: boolean;
  pe_most_likely: boolean;
  hr_gt_100: boolean;
  immobilization_or_surgery: boolean;
  previous_dvt_pe: boolean;
  hemoptysis: boolean;
  cancer: boolean;
}
export interface WellsPEResult { score: number; band: "low" | "moderate" | "high"; likely: boolean; }
export function runWellsPE(i: WellsPEInput): WellsPEResult {
  let s = 0;
  if (i.dvt_signs) s += 3;
  if (i.pe_most_likely) s += 3;
  if (i.hr_gt_100) s += 1.5;
  if (i.immobilization_or_surgery) s += 1.5;
  if (i.previous_dvt_pe) s += 1.5;
  if (i.hemoptysis) s += 1;
  if (i.cancer) s += 1;
  let b: WellsPEResult["band"] = "low";
  if (s > 6) b = "high";
  else if (s >= 2) b = "moderate";
  return { score: s, band: b, likely: s > 4 };
}
