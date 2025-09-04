export type RiskInputs = {
  hba1c?: number;           // %
  fastingGlucose?: number;  // mg/dL
  bmi?: number;             // kg/m^2
  familyHistory?: boolean;
  smoking?: boolean;
  egfr?: number;            // mL/min/1.73m²
};

export type RiskBand = 'Green' | 'Yellow' | 'Red';
export interface RiskResult {
  riskScore: number; // 0-100
  band: RiskBand;
  factors: { name: string; contribution: number }[];
  recommendations: string[];
}

function band(score: number): RiskBand {
  if (score >= 70) return 'Red';
  if (score >= 35) return 'Yellow';
  return 'Green';
}

/** Simple, explainable heuristic. Tweak weights later. */
export function scoreRisk(i: RiskInputs): RiskResult {
  let score = 0;
  const factors: { name: string; contribution: number }[] = [];

  if (i.hba1c !== undefined) {
    if (i.hba1c >= 8.5) { score += 30; factors.push({ name: 'HbA1c ≥ 8.5%', contribution: 30 }); }
    else if (i.hba1c >= 7.0) { score += 20; factors.push({ name: 'HbA1c 7.0–8.4%', contribution: 20 }); }
    else if (i.hba1c >= 6.5) { score += 10; factors.push({ name: 'HbA1c 6.5–6.9%', contribution: 10 }); }
  }

  if (i.fastingGlucose !== undefined) {
    if (i.fastingGlucose >= 180) { score += 20; factors.push({ name: 'FPG ≥ 180 mg/dL', contribution: 20 }); }
    else if (i.fastingGlucose >= 126) { score += 10; factors.push({ name: 'FPG 126–179 mg/dL', contribution: 10 }); }
  }

  if (i.bmi !== undefined) {
    if (i.bmi >= 35) { score += 15; factors.push({ name: 'BMI ≥ 35', contribution: 15 }); }
    else if (i.bmi >= 30) { score += 10; factors.push({ name: 'BMI 30–34.9', contribution: 10 }); }
  }

  if (i.egfr !== undefined && i.egfr < 60) {
    score += 25; factors.push({ name: 'eGFR < 60', contribution: 25 });
  }

  if (i.familyHistory) { score += 10; factors.push({ name: 'Family history', contribution: 10 }); }
  if (i.smoking)      { score += 10; factors.push({ name: 'Smoking', contribution: 10 }); }

  if (score > 100) score = 100;
  const b = band(score);

  const recommendations: string[] = [];
  if (b !== 'Green') {
    recommendations.push('Follow up with clinician for optimization.');
    if (i.hba1c && i.hba1c >= 7.0) recommendations.push('Tighten glycemic control; review meds/insulin.');
    if (i.egfr !== undefined && i.egfr < 60) recommendations.push('Renal protection (ACEi/ARB/SGLT2 if appropriate).');
    if (i.smoking) recommendations.push('Offer smoking cessation support.');
    if (i.bmi && i.bmi >= 30) recommendations.push('Weight management plan and dietician referral.');
  }

  return { riskScore: Math.round(score), band: b, factors, recommendations };
}
