export type qSOFAInputs = {
  rr_ge_22: boolean;
  sbp_le_100: boolean;
  altered_mentation: boolean;
};

export function calc_qsofa(i: qSOFAInputs): number {
  let s = 0;
  if (i.rr_ge_22) s += 1;
  if (i.sbp_le_100) s += 1;
  if (i.altered_mentation) s += 1;
  return s;
}

const def = {
  id: "qsofa",
  label: "qSOFA",
  inputs: [
    { id: "rr_ge_22", label: "RR ≥22/min", type: "boolean" },
    { id: "sbp_le_100", label: "SBP ≤100 mmHg", type: "boolean" },
    { id: "altered_mentation", label: "Altered mentation", type: "boolean" }
  ],
  run: (args: qSOFAInputs) => {
    const v = calc_qsofa(args);
    return { id: "qsofa", label: "qSOFA", value: v, unit: "criteria", precision: 0, notes: [] };
  },
};

export default def;
