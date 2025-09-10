/**
 * Canadian CT Head Rule (adults with minor head injury, GCS 13–15)
 * High-risk and medium-risk features. If any present, CT recommended.
 * Inputs align to commonly used features.
 */
export interface CCHRInput {
  gcs_lt_15_at_2h: boolean;
  suspected_open_or_depressed_skull_fracture: boolean;
  signs_of_basal_skull_fracture: boolean;
  vomiting_ge_2: boolean;
  age_ge_65: boolean;
  amnesia_ge_30min: boolean;
  dangerous_mechanism: boolean;
}
export interface CCHRResult { recommend_ct: boolean; }
export function runCCHR(i: CCHRInput): CCHRResult {
  const any = i.gcs_lt_15_at_2h || i.suspected_open_or_depressed_skull_fracture || i.signs_of_basal_skull_fracture ||
              i.vomiting_ge_2 || i.age_ge_65 || i.amnesia_ge_30min || i.dangerous_mechanism;
  return { recommend_ct: any };
}
