/**
 * HOMA-IR
 * If glucose_unit is mgdl: HOMA = insulin_uU_ml * glucose_mg_dl / 405
 * If glucose_unit is mmoll: HOMA = insulin_uU_ml * glucose_mmoll / 22.5
 */
export type GlucoseUnit = "mgdl" | "mmoll";
export interface HOMAInput {
  fasting_insulin_uU_ml: number;
  fasting_glucose_value: number;
  glucose_unit?: GlucoseUnit; // default mgdl
}
export interface HOMAResult { homa_ir: number; }
export function runHOMA_IR(i: HOMAInput): HOMAResult {
  const unit = i.glucose_unit ?? "mgdl";
  const value = unit === "mgdl" ? (i.fasting_insulin_uU_ml * i.fasting_glucose_value / 405) : (i.fasting_insulin_uU_ml * i.fasting_glucose_value / 22.5);
  return { homa_ir: value };
}
