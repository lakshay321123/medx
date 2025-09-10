// lib/medical/engine/calculators/abic.ts
// ABIC: 0.1*Age + 0.08*Bilirubin + 0.8*INR + 0.3*Creatinine

export interface ABICInput {
  age_years?: number | null;
  bilirubin_mg_dL?: number | null;
  inr?: number | null;
  creatinine_mg_dL?: number | null;
}

export interface ABICOutput {
  score: number;
  risk_band: "low" | "intermediate" | "high";
}

export function runABIC(i: ABICInput): ABICOutput {
  const age = i.age_years ?? 0;
  const bili = i.bilirubin_mg_dL ?? 0;
  const inr = i.inr ?? 0;
  const cr = i.creatinine_mg_dL ?? 0;
  const score = 0.1*age + 0.08*bili + 0.8*inr + 0.3*cr;
  let band: "low"|"intermediate"|"high" = "low";
  if (score > 9.0) band = "high";
  else if (score >= 6.71) band = "intermediate";
  return { score, risk_band: band };
}
