import { register } from "../registry";

export type RoxInputs = { SpO2: number, FiO2: number, RR: number };
export type RoxResult = { value: number, risk12h?: "low"|"high" };

export function runRox({ SpO2, FiO2, RR }: RoxInputs): RoxResult | null {
  if ([SpO2, FiO2, RR].some(v => v == null || !isFinite(v as number))) return null;
  if (FiO2 <= 0 || RR <= 0) return null;
  const sf = (SpO2 / 100) / FiO2;
  const value = Number((sf / RR).toFixed(2));
  // Common threshold: ROX < 3.85 at 12h predicts HFNC failure (high risk)
  const risk12h = value < 3.85 ? "high" : "low";
  return { value, risk12h };
}

register({
  id: "rox_index",
  label: "ROX Index",
  inputs: [{ key: "SpO2", required: true }, { key: "FiO2", required: true }, { key: "RR", required: true }],
  run: runRox as any,
});
