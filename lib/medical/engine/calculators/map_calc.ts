// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

export type MAPInputs = { sbp_mm_hg: number; dbp_mm_hg: number };

export function calc_map({ sbp_mm_hg, dbp_mm_hg }: MAPInputs): number {
  return (sbp_mm_hg + 2 * dbp_mm_hg) / 3;
}

const def = {
  id: "map_calc",
  label: "Mean Arterial Pressure (MAP)",
  inputs: [
    { id: "sbp_mm_hg", label: "SBP (mmHg)", type: "number", min: 0 },
    { id: "dbp_mm_hg", label: "DBP (mmHg)", type: "number", min: 0 }
  ],
  run: (args: MAPInputs) => {
    const v = calc_map(args);
    return { id: "map_calc", label: "MAP", value: v, unit: "mmHg", precision: 1, notes: [] };
  },
};

export default def;
