export type ShockIndexInputs = { hr_bpm: number; sbp_mm_hg: number };

export function calc_shock_index(i: ShockIndexInputs): number {
  if (i.sbp_mm_hg <= 0) return NaN;
  return i.hr_bpm / i.sbp_mm_hg;
}

const def = {
  id: "shock_index",
  label: "Shock Index (HR/SBP)",
  inputs: [
    { id: "hr_bpm", label: "Heart rate (bpm)", type: "number", min: 0 },
    { id: "sbp_mm_hg", label: "Systolic BP (mmHg)", type: "number", min: 1 }
  ],
  run: (args: ShockIndexInputs) => {
    const v = calc_shock_index(args);
    const notes = [v >= 0.9 ? "elevated (≥0.9)" : ""];
    return { id: "shock_index", label: "Shock Index", value: v, unit: "", precision: 2, notes: notes.filter(Boolean) };
  },
};

export default def;
