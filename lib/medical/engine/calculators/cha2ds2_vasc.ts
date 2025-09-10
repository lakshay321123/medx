/**
 * CHA2DS2-VASc (0–9)
 * CHF, Hypertension, Age 65–74, Age >=75 (2 points), Diabetes, Stroke/TIA (2), Vascular disease, Female sex
 */
export interface CHA2DS2VAScInput {
  chf: boolean;
  htn: boolean;
  age: number;
  dm: boolean;
  stroke_tia_thromboembolism: boolean;
  vascular_disease: boolean;
  female_sex: boolean;
}
export interface CHA2DS2VAScResult { score: number; }
export function runCHA2DS2VASc(i: CHA2DS2VAScInput): CHA2DS2VAScResult {
  let s = 0;
  if (i.chf) s += 1;
  if (i.htn) s += 1;
  if (i.age >= 75) s += 2;
  else if (i.age >= 65) s += 1;
  if (i.dm) s += 1;
  if (i.stroke_tia_thromboembolism) s += 2;
  if (i.vascular_disease) s += 1;
  if (i.female_sex) s += 1;
  return { score: s };
}
