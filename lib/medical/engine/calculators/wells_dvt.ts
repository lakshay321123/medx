/**
 * Wells DVT score
 * Score: multiple items 1 point; alternative diagnosis more likely subtracts 2
 * Bands: Low <=0, Moderate 1–2, High >=3
 */
export interface WellsDVTInput {
  active_cancer: boolean;
  paralysis_or_cast: boolean;
  bedridden_recent: boolean;
  localized_tenderness: boolean;
  entire_leg_swollen: boolean;
  calf_swelling_3cm: boolean;
  pitting_edema: boolean;
  collateral_superficial_veins: boolean;
  previous_dvt: boolean;
  alternative_diagnosis_more_likely: boolean;
}
export interface WellsDVTResult { score: number; band: "low" | "moderate" | "high"; }
export function runWellsDVT(i: WellsDVTInput): WellsDVTResult {
  let s = 0;
  const positives = [i.active_cancer, i.paralysis_or_cast, i.bedridden_recent, i.localized_tenderness, i.entire_leg_swollen, i.calf_swelling_3cm, i.pitting_edema, i.collateral_superficial_veins, i.previous_dvt];
  s += positives.filter(Boolean).length;
  if (i.alternative_diagnosis_more_likely) s -= 2;
  let b: WellsDVTResult["band"] = "low";
  if (s >= 3) b = "high";
  else if (s >= 1) b = "moderate";
  return { score: s, band: b };
}
