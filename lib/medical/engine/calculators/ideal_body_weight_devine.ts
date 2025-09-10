/**
 * Ideal Body Weight (Devine):
 * Male: 50 + 2.3*(inches over 5 ft)
 * Female: 45.5 + 2.3*(inches over 5 ft)
 * Input height in cm; conversion: inches = cm / 2.54
 */
export interface IBWInput {
  sex: "male" | "female";
  height_cm: number;
}
export interface IBWResult { ibw_kg: number; inches_over_5ft: number; }
export function runIBWDevine(i: IBWInput): IBWResult {
  const inches = i.height_cm / 2.54;
  const over = Math.max(0, inches - 60);
  const base = i.sex === "male" ? 50 : 45.5;
  const ibw = base + 2.3 * over;
  return { ibw_kg: ibw, inches_over_5ft: over };
}
