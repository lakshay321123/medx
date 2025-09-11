export type ABCD2Inputs = {
  age_ge_60: boolean;
  sbp_ge_140_or_dbp_ge_90: boolean;
  unilateral_weakness: boolean;
  speech_impairment_without_weakness: boolean;
  duration_min: number;
  diabetes: boolean;
};

export function calc_abcd2(i: ABCD2Inputs): { score:number; risk:"low"|"moderate"|"high" } {
  let s = 0;
  s += i.age_ge_60 ? 1 : 0;
  s += i.sbp_ge_140_or_dbp_ge_90 ? 1 : 0;
  s += i.unilateral_weakness ? 2 : 0;
  s += (!i.unilateral_weakness && i.speech_impairment_without_weakness) ? 1 : 0;
  s += i.duration_min >= 60 ? 2 : (i.duration_min >= 10 ? 1 : 0);
  s += i.diabetes ? 1 : 0;
  let risk:"low"|"moderate"|"high" = "low";
  if (s >= 6) risk = "high";
  else if (s >= 4) risk = "moderate";
  return { score: s, risk };
}

const def = {
  id: "abcd2_tia",
  label: "ABCD² (TIA risk)",
  inputs: [
    { id: "age_ge_60", label: "Age ≥60", type: "boolean" },
    { id: "sbp_ge_140_or_dbp_ge_90", label: "BP ≥140/90", type: "boolean" },
    { id: "unilateral_weakness", label: "Unilateral weakness", type: "boolean" },
    { id: "speech_impairment_without_weakness", label: "Speech impairment without weakness", type: "boolean" },
    { id: "duration_min", label: "Duration (minutes)", type: "number", min: 0 },
    { id: "diabetes", label: "Diabetes", type: "boolean" }
  ],
  run: (args: ABCD2Inputs) => {
    const r = calc_abcd2(args);
    const notes = [r.risk];
    return { id: "abcd2_tia", label: "ABCD²", value: r.score, unit: "points", precision: 0, notes, extra: r };
  },
};

export default def;
