export type ABCD2Inputs = {
  age_ge_60: boolean;
  sbp_ge_140_or_dbp_ge_90: boolean;
  unilateral_weakness: boolean;
  speech_disturbance_without_weakness: boolean;
  duration_ge_60min: boolean;
  duration_10_to_59min: boolean;
  diabetes: boolean;
};

export function calc_abcd2(i: ABCD2Inputs): number {
  let s = 0;
  s += i.age_ge_60 ? 1 : 0;
  s += i.sbp_ge_140_or_dbp_ge_90 ? 1 : 0;
  s += i.unilateral_weakness ? 2 : 0;
  s += (!i.unilateral_weakness && i.speech_disturbance_without_weakness) ? 1 : 0;
  s += i.duration_ge_60min ? 2 : 0;
  s += (!i.duration_ge_60min && i.duration_10_to_59min) ? 1 : 0;
  s += i.diabetes ? 1 : 0;
  return s;
}

const def = {
  id: "abcd2",
  label: "ABCD² (TIA early stroke risk)",
  inputs: [
    { id: "age_ge_60", label: "Age ≥60", type: "boolean" },
    { id: "sbp_ge_140_or_dbp_ge_90", label: "SBP ≥140 or DBP ≥90", type: "boolean" },
    { id: "unilateral_weakness", label: "Unilateral weakness", type: "boolean" },
    { id: "speech_disturbance_without_weakness", label: "Speech disturbance without weakness", type: "boolean" },
    { id: "duration_ge_60min", label: "Duration ≥60 min", type: "boolean" },
    { id: "duration_10_to_59min", label: "Duration 10–59 min", type: "boolean" },
    { id: "diabetes", label: "Diabetes", type: "boolean" }
  ],
  run: (args: ABCD2Inputs) => {
    const v = calc_abcd2(args);
    return { id: "abcd2", label: "ABCD²", value: v, unit: "points", precision: 0, notes: [] };
  },
};

export default def;
