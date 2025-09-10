
import { register } from "../registry";
export interface ProteinGoalInput { weight_kg: number; g_per_kg?: number; }
export interface ProteinGoalResult { protein_g_per_day: number; }
export function runProteinGoal(i: ProteinGoalInput): ProteinGoalResult {
  const rate = i.g_per_kg ?? 1.2;
  return { protein_g_per_day: Math.round(rate * i.weight_kg) };
}
register({
  id: "protein_goal",
  label: "Protein goal (g/kg)",
  inputs: [{ key: "weight_kg", required: true }, { key: "g_per_kg" }],
  run: ({ weight_kg, g_per_kg }) => {
    if (weight_kg == null) return null;
    const r = runProteinGoal({ weight_kg, g_per_kg });
    return { id: "protein_goal", label: "Protein goal", value: r.protein_g_per_day, unit: "g/day", precision: 0 };
  },
});
