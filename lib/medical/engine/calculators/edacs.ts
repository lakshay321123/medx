/**
 * EDACS (Emergency Department Assessment of Chest Pain Score)
 * Source: ACC summary of EDACS components and thresholds. See:
 * - ACC: "Chest Pain Risk Stratification in the Emergency Department: Current Perspectives" (EDACS table). 
 *
 * NOTE: This is scoring only; your clinical pathways (e.g., EDACS-ADP with serial troponins) should be handled elsewhere.
 */

export interface EDACSInput {
  age_years: number;
  male: boolean;
  known_cad_or_ge3_riskf?: boolean; // prior CAD OR ≥3 risk factors
  diaphoresis?: boolean;
  radiation_to_arm_or_shoulder?: boolean;
  pain_described_as_pressure?: boolean;
  pain_worse_with_inspiration?: boolean; // pleuritic → negative points
  pain_reproducible_by_palpation?: boolean; // chest wall tenderness → negative points
}

export interface EDACSOutput {
  score: number;
  lowRiskCutoff16: boolean; // EDACS < 16 is commonly used in EDACS-ADP
  details: Record<string, number>;
}

function agePoints(age: number): number {
  if (age < 18) return 0; // out of scope
  if (age <= 45) return 2;
  if (age <= 50) return 4;
  if (age <= 55) return 6;
  if (age <= 60) return 8;
  if (age <= 65) return 10;
  if (age <= 70) return 12;
  if (age <= 75) return 14;
  if (age <= 80) return 16;
  if (age <= 85) return 18;
  return 20; // ≥86
}

export function runEDACS(i: EDACSInput): EDACSOutput {
  const details: Record<string, number> = {};

  details.age = agePoints(i.age_years);
  details.male = i.male ? 6 : 0;
  details.known_cad_or_ge3_riskf = i.known_cad_or_ge3_riskf ? 4 : 0;
  details.diaphoresis = i.diaphoresis ? 3 : 0;
  details.radiation_to_arm_or_shoulder = i.radiation_to_arm_or_shoulder ? 5 : 0;
  details.pain_described_as_pressure = i.pain_described_as_pressure ? 3 : 0;
  details.pain_worse_with_inspiration = i.pain_worse_with_inspiration ? -4 : 0;
  details.pain_reproducible_by_palpation = i.pain_reproducible_by_palpation ? -6 : 0;

  const score = Object.values(details).reduce((a, b) => a + b, 0);
  return { score, lowRiskCutoff16: score < 16, details };
}
