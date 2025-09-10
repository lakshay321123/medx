/**
 * Rockall post endoscopy score (0 to 11)
 * Age: <60 = 0, 60 to 79 = 1, >=80 = 2
 * Shock: none = 0, tachycardia only = 1, hypotension = 2
 * Comorbidity: none = 0, CHF or IHD or other major = 2, renal failure or liver failure or metastatic cancer = 3
 * Diagnosis: Mallory Weiss = 0, all other diagnoses = 1, upper GI malignancy = 2
 * Stigmata: none or dark spot = 0, blood in upper GI or visible vessel or active bleeding or adherent clot = 2
 */
export interface RockallPostInput {
  age_years: number;
  shock: "none" | "tachycardia" | "hypotension";
  comorbidity: "none" | "major" | "very_major";
  diagnosis: "mallory_weiss" | "other" | "malignancy";
  stigmata: "none" | "srh_present";
}
export interface RockallPostResult { score: number; band: "low" | "moderate" | "high"; }
export function runRockallPost(i: RockallPostInput): RockallPostResult {
  let s = 0;
  if (i.age_years >= 80) s += 2;
  else if (i.age_years >= 60) s += 1;
  if (i.shock === "tachycardia") s += 1;
  else if (i.shock === "hypotension") s += 2;
  if (i.comorbidity === "major") s += 2;
  else if (i.comorbidity === "very_major") s += 3;
  if (i.diagnosis === "other") s += 1;
  else if (i.diagnosis === "malignancy") s += 2;
  if (i.stigmata === "srh_present") s += 2;
  let band: RockallPostResult["band"] = "low";
  if (s >= 5) band = "high";
  else if (s >= 3) band = "moderate";
  return { score: s, band };
}
