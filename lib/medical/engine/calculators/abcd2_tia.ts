/**
 * ABCD2 TIA score (0 to 7)
 * A: Age >= 60 years (1)
 * B: Blood pressure >=140 systolic or >=90 diastolic (1)
 * C: Clinical features: unilateral weakness (2) or speech impairment without weakness (1)
 * D: Duration: >=60 minutes (2) or 10 to 59 minutes (1)
 * D: Diabetes (1)
 */
export interface ABCD2Input {
  age: number;
  sbp_mmHg: number;
  dbp_mmHg: number;
  unilateral_weakness: boolean;
  speech_impairment_without_weakness: boolean;
  duration_minutes: number;
  diabetes: boolean;
}
export interface ABCD2Result { score: number; band: "low" | "moderate" | "high"; }
export function runABCD2(i: ABCD2Input): ABCD2Result {
  let s = 0;
  if (i.age >= 60) s += 1;
  if (i.sbp_mmHg >= 140 || i.dbp_mmHg >= 90) s += 1; // <-- fixed here
  if (i.unilateral_weakness) s += 2;
  else if (i.speech_impairment_without_weakness) s += 1;
  if (i.duration_minutes >= 60) s += 2;
  else if (i.duration_minutes >= 10) s += 1;
  if (i.diabetes) s += 1;
  let band: ABCD2Result["band"] = "low";
  if (s >= 6) band = "high";
  else if (s >= 4) band = "moderate";
  return { score: s, band };
}
