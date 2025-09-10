import { register } from "../registry";

/**
 * Bicarbonate Deficit = (target - actual) * 0.5 * weight_kg
 * Default target: 24 mEq/L
 */
export function calc_bicarbonate_deficit({
  actual_hco3, weight_kg, target_hco3
}: {
  actual_hco3: number,
  weight_kg: number,
  target_hco3?: number
}) {
  const target = target_hco3 ?? 24;
  const deficit = (target - actual_hco3) * 0.5 * weight_kg;
  return { target, deficit };
}

register({
  id: "bicarbonate_deficit",
  label: "Bicarbonate Deficit",
  tags: ["acid-base", "critical care"],
  inputs: [
    { key: "actual_hco3", required: true },
    { key: "weight_kg", required: true },
    { key: "target_hco3" }
  ],
  run: ({ actual_hco3, weight_kg, target_hco3 }: { actual_hco3: number; weight_kg: number; target_hco3?: number; }) => {
    const r = calc_bicarbonate_deficit({ actual_hco3, weight_kg, target_hco3 });
    const notes = [`target=${r.target} mEq/L`];
    return { id: "bicarbonate_deficit", label: "Bicarbonate Deficit", value: r.deficit, unit: "mEq", precision: 0, notes, extra: r };
  },
});
