import { register } from "../registry";

/**
 * S/F ratio (SpO2/FiO2), useful surrogate for PF ratio when ABG is not available.
 */
export type SFInputs = { SpO2_pct: number; FiO2: number };

export function runSF({ SpO2_pct, FiO2 }: SFInputs) {
  if ([SpO2_pct,FiO2].some(v => v == null) || FiO2 <= 0) return null;
  const sf = SpO2_pct / FiO2;
  return { sf_ratio: sf };
}

register({
  id: "sf_ratio",
  label: "S/F ratio",
  inputs: [
    { key: "SpO2_pct", required: true },
    { key: "FiO2", required: true },
  ],
  run: (ctx) => {
    const r = runSF(ctx as SFInputs);
    if (!r) return null;
    const notes:string[] = [];
    if (r.sf_ratio < 235) notes.push("≈ PF<200 (ARDS moderate–severe surrogate)");
    return { id: "sf_ratio", label: "S/F ratio", value: Number(r.sf_ratio.toFixed(0)), unit: "", precision: 0, notes };
  },
});
