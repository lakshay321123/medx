// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.

export type ABCD2Inputs = {
  age_years: number;
  sbp_mm_hg: number;
  dbp_mm_hg: number;
  unilateral_weakness: boolean;
  speech_disturbance_without_weakness: boolean;
  duration_minutes: number;
  diabetes: boolean;
};

export function calc_abcd2({
  age_years, sbp_mm_hg, dbp_mm_hg, unilateral_weakness, speech_disturbance_without_weakness, duration_minutes, diabetes
}: ABCD2Inputs): number {
  let score = 0;
  if (age_years >= 60) score += 1;
  if (sbp_mm_hg >= 140 || dbp_mm_hg >= 90) score += 1;
  if (unilateral_weakness) score += 2;
  else if (speech_disturbance_without_weakness) score += 1;
  if (duration_minutes >= 60) score += 2;
  else if (duration_minutes >= 10) score += 1;
  if (diabetes) score += 1;
  return score;
}

const def = {
  id: "abcd2",
  label: "ABCD2 (TIA)",
  inputs: [
    { id: "age_years", label: "Age", type: "number", min: 0, max: 120 },
    { id: "sbp_mm_hg", label: "SBP (mmHg)", type: "number", min: 0 },
    { id: "dbp_mm_hg", label: "DBP (mmHg)", type: "number", min: 0 },
    { id: "unilateral_weakness", label: "Unilateral weakness", type: "boolean" },
    { id: "speech_disturbance_without_weakness", label: "Speech disturbance only", type: "boolean" },
    { id: "duration_minutes", label: "Duration (min)", type: "number", min: 0 },
    { id: "diabetes", label: "Diabetes", type: "boolean" }
  ],
  run: (args: ABCD2Inputs) => {
    const v = calc_abcd2(args);
    return { id: "abcd2", label: "ABCD2 (TIA)", value: v, unit: "score", precision: 0, notes: [] };
  },
};

export default def;
