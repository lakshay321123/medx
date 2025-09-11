// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

export type ShockIndexInputs = { hr_bpm: number; sbp_mm_hg: number; dbp_mm_hg?: number };

export function calc_shock_index({ hr_bpm, sbp_mm_hg }: ShockIndexInputs): number {
  if (sbp_mm_hg <= 0) return NaN;
  return hr_bpm / sbp_mm_hg;
}

export function calc_modified_shock_index({ hr_bpm, sbp_mm_hg, dbp_mm_hg }: ShockIndexInputs): number {
  if (!dbp_mm_hg || dbp_mm_hg <= 0) return NaN;
  const map = (sbp_mm_hg + 2 * dbp_mm_hg) / 3;
  if (map <= 0) return NaN;
  return hr_bpm / map;
}

const def = {
  id: "shock_index",
  label: "Shock Index (± Modified)",
  inputs: [
    { id: "hr_bpm", label: "Heart rate (bpm)", type: "number", min: 0 },
    { id: "sbp_mm_hg", label: "SBP (mmHg)", type: "number", min: 0 },
    { id: "dbp_mm_hg", label: "DBP (mmHg)", type: "number", min: 0 }
  ],
  run: (args: ShockIndexInputs) => {
    const si = calc_shock_index(args);
    const msi = calc_modified_shock_index(args);
    const notes = [Number.isFinite(msi) ? `MSI ${msi.toFixed(2)}` : ""];
    return { id: "shock_index", label: "Shock Index", value: si, unit: "", precision: 2, notes: notes.filter(Boolean), extra: { si, msi } };
  },
};

export default def;
