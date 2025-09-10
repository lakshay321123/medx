/**
 * MDRD 4-variable (race-free version)
 * eGFR = 175 * Scr^-1.154 * age^-0.203 * (0.742 if female)
 */
export interface MDRDInput {
  sex: "male" | "female";
  age: number;
  scr_mg_dl: number;
}
export interface MDRDResult { egfr_ml_min_1_73m2: number; }
export function runEGFR_MDRD(i: MDRDInput): MDRDResult {
  let egfr = 175 * Math.pow(i.scr_mg_dl, -1.154) * Math.pow(i.age, -0.203);
  if (i.sex === "female") egfr *= 0.742;
  return { egfr_ml_min_1_73m2: egfr };
}
