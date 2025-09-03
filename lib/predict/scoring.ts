export type RiskInputs = {
  hba1c?: number;
  fastingGlucose?: number;
  bmi?: number;
  familyHistory?: boolean;
  smoking?: boolean;
  egfr?: number;
};

export type RiskBand = 'Green' | 'Yellow' | 'Red';

export interface RiskResult {
  riskScore: number;
  band: RiskBand;
  factors: { name: string; contribution: number }[];
}

export function scoreBand(score: number): RiskBand {
  if (score < 35) return 'Green';
  if (score < 65) return 'Yellow';
  return 'Red';
}

export function computeRisk(inputs: RiskInputs): RiskResult {
  let score = 0;
  const factors: { name: string; contribution: number }[] = [];

  if (inputs.hba1c !== undefined) {
    if (inputs.hba1c >= 6.5) {
      score += 40;
      factors.push({ name: 'HbA1c >= 6.5', contribution: 40 });
    } else if (inputs.hba1c >= 5.7) {
      score += 20;
      factors.push({ name: 'HbA1c 5.7-6.4', contribution: 20 });
    }
  }

  if (inputs.fastingGlucose !== undefined) {
    if (inputs.fastingGlucose >= 126) {
      score += 30;
      factors.push({ name: 'Fasting glucose >= 126', contribution: 30 });
    } else if (inputs.fastingGlucose >= 100) {
      score += 15;
      factors.push({ name: 'Fasting glucose 100-125', contribution: 15 });
    }
  }

  if (inputs.bmi !== undefined && inputs.bmi > 30) {
    score += 15;
    factors.push({ name: 'BMI > 30', contribution: 15 });
  }

  if (inputs.familyHistory) {
    score += 10;
    factors.push({ name: 'Family history', contribution: 10 });
  }

  if (inputs.smoking) {
    score += 10;
    factors.push({ name: 'Smoking', contribution: 10 });
  }

  if (inputs.egfr !== undefined && inputs.egfr < 60) {
    score += 25;
    factors.push({ name: 'eGFR < 60', contribution: 25 });
  }

  const band = scoreBand(score);
  return { riskScore: score, band, factors };
}
