/**
 * eGFR (MDRD 4-variable, traditional)
 * Output in ml/min/1.73 m²
 * Optional: race_black flag to include legacy race coefficient (1.212)
 */
export interface MDRDInput {
  age_years: number;
  sex: "male" | "female";
  scr_mg_dl: number;
  race_black?: boolean; // default false
}
export interface MDRDResult {
  egfr_ml_min_1_73: number;
}

export function runEGFR_MDRD(i: MDRDInput): MDRDResult {
  const age = Math.max(0, i.age_years);
  const scr = Math.max(0.01, i.scr_mg_dl);
  let egfr = 175 * Math.pow(scr, -1.154) * Math.pow(age, -0.203);
  if (i.sex === "female") egfr *= 0.742;
  if (i.race_black) egfr *= 1.212;
  return { egfr_ml_min_1_73: egfr };
}
