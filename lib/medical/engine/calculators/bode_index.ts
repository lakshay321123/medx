/**
 * BODE index for COPD (0 to 10)
 * BMI: <21 = 1 point else 0
 * FEV1 percent predicted: >=65 = 0, 50 to 64 = 1, 36 to 49 = 2, <=35 = 3
 * mMRC dyspnea: 0 to 1 = 0, 2 = 1, 3 = 2, 4 = 3
 * 6 minute walk distance meters: >=350 = 0, 250 to 349 = 1, 150 to 249 = 2, <=149 = 3
 */
export interface BODEInput {
  bmi: number;
  fev1_percent_predicted: number;
  mmrc: 0|1|2|3|4;
  six_mwd_m: number;
}
export interface BODEResult { score: number; }
export function runBODE(i: BODEInput): BODEResult {
  let s = 0;
  if (i.bmi < 21) s += 1;
  if (i.fev1_percent_predicted <= 35) s += 3;
  else if (i.fev1_percent_predicted <= 49) s += 2;
  else if (i.fev1_percent_predicted <= 64) s += 1;
  if (i.mmrc === 2) s += 1;
  else if (i.mmrc === 3) s += 2;
  else if (i.mmrc === 4) s += 3;
  if (i.six_mwd_m <= 149) s += 3;
  else if (i.six_mwd_m <= 249) s += 2;
  else if (i.six_mwd_m <= 349) s += 1;
  return { score: s };
}
