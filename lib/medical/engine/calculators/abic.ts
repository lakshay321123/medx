
// lib/medical/engine/calculators/abic.ts
// ABIC = 0.1*Age + 0.08*Bilirubin(mg/dL) + 0.8*INR + 0.3*Creatinine(mg/dL)
// Risk: <6.71 low, 6.71–8.99 intermediate, >=9 high

export interface ABICInput {
  age_years: number;
  bilirubin_mg_dL: number;
  inr: number;
  creatinine_mg_dL: number;
}

export type ABICBand = "low" | "intermediate" | "high";

export interface ABICOutput { score: number; band: ABICBand; }

export function abic(i: ABICInput): ABICOutput {
  const score = 0.1*i.age_years + 0.08*i.bilirubin_mg_dL + 0.8*i.inr + 0.3*i.creatinine_mg_dL;
  let band: ABICBand = "low";
  if (score >= 9) band = "high";
  else if (score >= 6.71) band = "intermediate";
  return { score: Math.round(score*100)/100, band };
}
