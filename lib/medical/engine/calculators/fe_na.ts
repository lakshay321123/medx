import { register } from "../registry";
/**
 * Fractional Excretion of Sodium (FENa%) = (UrineNa * SerumCr) / (SerumNa * UrineCr) * 100
 * Units cancel; values must be consistent.
 */
export function calc_fena({ urine_na, serum_na, urine_cr, serum_cr }:
  { urine_na: number, serum_na: number, urine_cr: number, serum_cr: number }) {
  if ([urine_na, serum_na, urine_cr, serum_cr].some(v => v == null || v <= 0)) return null;
  return (urine_na * serum_cr) / (serum_na * urine_cr) * 100;
}

function interpretFENa(v: number): string {
  if (v == null) return "";
  if (v < 1) return "suggests prerenal azotemia";
  if (v > 2) return "suggests intrinsic renal injury (e.g., ATN)";
  return "borderline";
}

register({
  id: "fe_na",
  label: "Fractional Excretion of Sodium (FENa)",
  tags: ["nephrology"],
  inputs: [
    { key: "urine_na", required: true },
    { key: "serum_na", required: true },
    { key: "urine_cr", required: true },
    { key: "serum_cr", required: true },
  ],
  run: ({ urine_na, serum_na, urine_cr, serum_cr }) => {
    const v = calc_fena({ urine_na, serum_na, urine_cr, serum_cr });
    if (v == null) return null;
    const notes = [interpretFENa(v)];
    return { id: "fe_na", label: "Fractional Excretion of Sodium (FENa)", value: v, unit: "%", precision: 1, notes };
  },
});
