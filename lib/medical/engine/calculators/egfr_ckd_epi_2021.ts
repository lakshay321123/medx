/**
 * eGFR (CKD-EPI 2021, creatinine, race-free)
 * eGFR = 142 * min(Scr/k, 1)^a * max(Scr/k, 1)^-1.200 * 0.9938^Age * (1.012 if female)
 * k = 0.7 for female, 0.9 for male
 * a = -0.241 for female, -0.302 for male
 */
export interface CKDEPI2021Input {
  sex: "male" | "female";
  age: number;
  scr_mg_dl: number;
}
export interface CKDEPI2021Result { egfr_ml_min_1_73m2: number; }
export function runEGFR_CKDEPI_2021(i: CKDEPI2021Input): CKDEPI2021Result {
  const k = i.sex === "female" ? 0.7 : 0.9;
  const a = i.sex === "female" ? -0.241 : -0.302;
  const ratio = i.scr_mg_dl / k;
  const minTerm = Math.min(ratio, 1);
  const maxTerm = Math.max(ratio, 1);
  let egfr = 142 * Math.pow(minTerm, a) * Math.pow(maxTerm, -1.200) * Math.pow(0.9938, i.age);
  if (i.sex === "female") egfr *= 1.012;
  return { egfr_ml_min_1_73m2: egfr };
}
