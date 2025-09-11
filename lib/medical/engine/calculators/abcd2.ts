export type ABCD2Inputs = {
  age_ge_60: boolean;
  bp_ge_140_90: boolean;
  clinical_weakness: boolean;
  clinical_speech_impairment_no_weakness: boolean;
  duration_ge_60min: boolean;
  duration_10_to_59: boolean;
  diabetes: boolean;
};

export function calc_abcd2(i: ABCD2Inputs): { score: number; risk: "low"|"moderate"|"high" } {
  let s = 0;
  if (i.age_ge_60) s += 1;
  if (i.bp_ge_140_90) s += 1;
  if (i.clinical_weakness) s += 2;
  else if (i.clinical_speech_impairment_no_weakness) s += 1;
  if (i.duration_ge_60min) s += 2;
  else if (i.duration_10_to_59) s += 1;
  if (i.diabetes) s += 1;
  let risk: "low"|"moderate"|"high" = "low";
  if (s >= 6) risk = "high";
  else if (s >= 4) risk = "moderate";
  return { score: s, risk };
}

const def = {
  id: "abcd2",
  label: "ABCD2 (TIA risk)",
  inputs: [
    { id: "age_ge_60", label: "Age ≥60", type: "boolean" },
    { id: "bp_ge_140_90", label: "BP ≥140/90", type: "boolean" },
    { id: "clinical_weakness", label: "Clinical unilateral weakness", type: "boolean" },
    { id: "clinical_speech_impairment_no_weakness", label: "Speech impairment without weakness", type: "boolean" },
    { id: "duration_ge_60min", label: "Duration ≥60 min", type: "boolean" },
    { id: "duration_10_to_59", label: "Duration 10–59 min", type: "boolean" },
    { id: "diabetes", label: "Diabetes", type: "boolean" }
  ],
  run: (args: ABCD2Inputs) => {
    const r = calc_abcd2(args);
    const notes = [r.risk];
    return { id: "abcd2", label: "ABCD2", value: r.score, unit: "points", precision: 0, notes, extra: r };
  },
};

export default def;
