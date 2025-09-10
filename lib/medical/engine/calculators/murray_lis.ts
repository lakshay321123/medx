/**
 * Murray Lung Injury Score (LIS)
 * Components (0–4 points each), final score = mean of 4 components:
 *  - Chest radiograph quadrants with alveolar consolidation: 0..4
 *  - Hypoxemia by PaO2/FiO2 (mmHg): >300=0; 225–300=1; 175–224=2; 100–174=3; <=100=4
 *  - PEEP (cmH2O): 0–5=0; 6–8=1; 9–11=2; 12–14=3; >=15=4
 *  - Static compliance (mL/cmH2O): >=80=0; 60–79=1; 40–59=2; 20–39=3; <=19=4
 * Ref: Murray et al., Am Rev Respir Dis. 1988; and common guideline summaries.
 */
export interface LISInput {
  cxr_quadrants_involved: 0|1|2|3|4;
  pao2_fio2_mmHg: number;
  peep_cmH2O: number;
  compliance_ml_per_cmH2O: number;
}
export interface LISResult {
  quadrants_points: number;
  pf_points: number;
  peep_points: number;
  compliance_points: number;
  lis_mean: number;
}
export function murrayLIS(i: LISInput): LISResult {
  const quadrants_points = i.cxr_quadrants_involved;

  let pf_points = 0;
  if (i.pao2_fio2_mmHg <= 100) pf_points = 4;
  else if (i.pao2_fio2_mmHg <= 174) pf_points = 3;
  else if (i.pao2_fio2_mmHg <= 224) pf_points = 2;
  else if (i.pao2_fio2_mmHg <= 300) pf_points = 1;
  else pf_points = 0;

  let peep_points = 0;
  if (i.peep_cmH2O >= 15) peep_points = 4;
  else if (i.peep_cmH2O >= 12) peep_points = 3;
  else if (i.peep_cmH2O >= 9) peep_points = 2;
  else if (i.peep_cmH2O >= 6) peep_points = 1;
  else peep_points = 0;

  let compliance_points = 0;
  if (i.compliance_ml_per_cmH2O <= 19) compliance_points = 4;
  else if (i.compliance_ml_per_cmH2O <= 39) compliance_points = 3;
  else if (i.compliance_ml_per_cmH2O <= 59) compliance_points = 2;
  else if (i.compliance_ml_per_cmH2O <= 79) compliance_points = 1;
  else compliance_points = 0;

  const lis_mean = (quadrants_points + pf_points + peep_points + compliance_points) / 4.0;
  return { quadrants_points, pf_points, peep_points, compliance_points, lis_mean };
}
