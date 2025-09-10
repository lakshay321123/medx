/**
 * BODE index for COPD (Body-mass, Obstruction, Dyspnea, Exercise)
 * Ref: Celli et al., NEJM 2004;350:1005-12.
 * Points:
 *  - BMI: <21 -> 1 else 0
 *  - FEV1%% predicted: >=65 ->0; 50-64 ->1; 36-49 ->2; <=35 ->3
 *  - mMRC dyspnea: 0-1 ->0; 2 ->1; 3 ->2; 4 ->3
 *  - 6MWD (m): >=350 ->0; 250-349 ->1; 150-249 ->2; <=149 ->3
 * Total 0-10. Quartiles: 0-2, 3-4, 5-6, 7-10
 */
export interface BODEInput {
  bmi: number;
  fev1_pct_pred: number;
  mmrc: 0|1|2|3|4;
  sixmwd_m: number;
}
export interface BODEResult {
  fev1_points: number;
  mmrc_points: number;
  sixmwd_points: number;
  bmi_points: number;
  total: number;
  quartile: 1|2|3|4;
}
export function bodeScore(i: BODEInput): BODEResult {
  const bmi_points = i.bmi < 21 ? 1 : 0;

  let fev1_points = 0;
  if (i.fev1_pct_pred <= 35) fev1_points = 3;
  else if (i.fev1_pct_pred <= 49) fev1_points = 2;
  else if (i.fev1_pct_pred <= 64) fev1_points = 1;
  else fev1_points = 0;

  let mmrc_points = 0;
  if (i.mmrc === 2) mmrc_points = 1;
  else if (i.mmrc === 3) mmrc_points = 2;
  else if (i.mmrc === 4) mmrc_points = 3;

  let sixmwd_points = 0;
  if (i.sixmwd_m <= 149) sixmwd_points = 3;
  else if (i.sixmwd_m <= 249) sixmwd_points = 2;
  else if (i.sixmwd_m <= 349) sixmwd_points = 1;

  const total = bmi_points + fev1_points + mmrc_points + sixmwd_points;
  const quartile = (total <= 2) ? 1 : (total <= 4) ? 2 : (total <= 6) ? 3 : 4;
  return { fev1_points, mmrc_points, sixmwd_points, bmi_points, total, quartile };
}
