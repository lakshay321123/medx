/**
 * Cockcroft-Gault Creatinine Clearance (mL/min):
 * CrCl = ((140 - age) * weight_kg * (0.85 if female)) / (72 * Scr_mg_dl)
 * Note: choose which weight to pass (actual/IBW/adjusted) per context.
 */
export interface CGInput {
  age: number;
  sex: "male" | "female";
  weight_kg: number;
  scr_mg_dl: number;
}
export interface CGResult { crcl_ml_min: number; }
export function runCockcroftGault(i: CGInput): CGResult {
  const sexFactor = (i.sex === "female") ? 0.85 : 1.0;
  const crcl = ((140 - i.age) * i.weight_kg * sexFactor) / (72 * i.scr_mg_dl);
  return { crcl_ml_min: crcl };
}
