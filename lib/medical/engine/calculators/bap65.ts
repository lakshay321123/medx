export interface BAP65Input {
  bun_mg_dL: number;
  altered_mental_status: boolean;
  pulse_bpm: number;
  age_years: number;
}

export function runBAP65(i: BAP65Input) {
  let score = 0;
  if (i.bun_mg_dL >= 25) score += 1;
  if (i.altered_mental_status) score += 1;
  if (i.pulse_bpm >= 109) score += 1;
  if (i.age_years >= 65) score += 1;
  return { score, risk: score >= 3 ? "high" : (score === 2 ? "moderate" : "low") };
}
