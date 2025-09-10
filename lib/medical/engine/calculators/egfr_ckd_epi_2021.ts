/**
 * eGFR (CKD-EPI 2021, race-free)
 * Ref: Inker LA et al. NEJM 2021.
 * Inputs: age (years), sex ("male" | "female"), Scr (mg/dL)
 * Output: ml/min/1.73 m²
 */
export interface CKDEPI21Input {
  age_years: number;
  sex: "male" | "female";
  scr_mg_dl: number;
}
export interface CKDEPI21Result {
  egfr_ml_min_1_73: number;
}

export function runEGFR_CKDEPI_2021(i: CKDEPI21Input): CKDEPI21Result {
  const age = Math.max(0, i.age_years);
  const scr = Math.max(0.01, i.scr_mg_dl); // avoid zero
  const female = i.sex === "female";

  const k = female ? 0.7 : 0.9;
  const a = female ? -0.241 : -0.302;
  const minScr = Math.min(scr / k, 1);
  const maxScr = Math.max(scr / k, 1);

  const egfr = 142 * Math.pow(minScr, a) * Math.pow(maxScr, -1.200) * Math.pow(0.9938, age) * (female ? 1.012 : 1);
  return { egfr_ml_min_1_73: egfr };
}
