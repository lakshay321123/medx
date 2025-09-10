import { register } from "../registry";
/**
 * Fractional Excretion of Urea (FEUrea%) = (UrineUrea * SerumCr) / (SerumUrea * UrineCr) * 100
 * Use when on diuretics.
 */
export function calc_feurea({ urine_urea, serum_urea, urine_cr, serum_cr }:
  { urine_urea: number, serum_urea: number, urine_cr: number, serum_cr: number }) {
  if ([urine_urea, serum_urea, urine_cr, serum_cr].some(v => v == null || v <= 0)) return null;
  return (urine_urea * serum_cr) / (serum_urea * urine_cr) * 100;
}

function interpretFEUrea(v: number): string {
  if (v == null) return "";
  if (v < 35) return "suggests prerenal azotemia";
  if (v > 50) return "suggests intrinsic renal injury";
  return "borderline";
}

register({
  id: "fe_urea",
  label: "Fractional Excretion of Urea (FEUrea)",
  tags: ["nephrology"],
  inputs: [
    { key: "urine_urea", required: true },
    { key: "serum_urea", required: true },
    { key: "urine_cr", required: true },
    { key: "serum_cr", required: true },
  ],
  run: ({ urine_urea, serum_urea, urine_cr, serum_cr }) => {
    const v = calc_feurea({ urine_urea, serum_urea, urine_cr, serum_cr });
    if (v == null) return null;
    const notes = [interpretFEUrea(v)];
    return { id: "fe_urea", label: "Fractional Excretion of Urea (FEUrea)", value: v, unit: "%", precision: 1, notes };
  },
});
