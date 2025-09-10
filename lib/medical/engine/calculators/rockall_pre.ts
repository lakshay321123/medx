// lib/medical/engine/calculators/rockall_pre.ts
export interface RockallPreInput {
  age?: number | null;
  shock?: "none"|"tachycardia"|"hypotension"|null; // HR>100 or SBP<100
  comorbidity?: "none"|"minor"|"major"|null; // CHF, IHD, renal, liver, malignancy
}
export interface RockallPreOutput { points: number; }

export function runRockallPre(i: RockallPreInput): RockallPreOutput {
  let pts = 0;
  const age = i.age ?? 0;
  if (age < 60) pts += 0; else if (age <= 79) pts += 1; else pts += 2;
  const sh = i.shock ?? "none";
  pts += sh === "none" ? 0 : (sh === "tachycardia" ? 1 : 2);
  const co = i.comorbidity ?? "none";
  pts += co === "none" ? 0 : (co === "minor" ? 2 : 3);
  return { points: pts };
}
