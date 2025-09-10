import { register } from "../registry";

export type ShockIndexInputs = { HR: number, SBP: number };
export type ShockIndexResult = { value: number, band: "normal"|"elevated"|"critical" };

export function runShockIndex({ HR, SBP }: ShockIndexInputs): ShockIndexResult | null {
  if (HR == null || SBP == null) return null;
  if (!isFinite(HR) || !isFinite(SBP) || HR <= 0 || SBP <= 0) return null;
  const value = Number((HR / SBP).toFixed(2));
  let band: ShockIndexResult["band"] = "normal";
  if (value >= 0.9 && value < 1.3) band = "elevated";
  else if (value >= 1.3) band = "critical";
  return { value, band };
}

register({
  id: "shock_index",
  label: "Shock Index (HR/SBP)",
  inputs: [{ key: "HR", required: true }, { key: "SBP", required: true }],
  run: runShockIndex as any,
});
