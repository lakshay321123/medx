import { register } from "../registry";

/**
 * Free Water Deficit = TBW * (Na/140 - 1)
 * TBW = weight_kg * factor (male 0.6, female 0.5)
 */
export function calc_free_water_deficit({
  serum_na, weight_kg, sex
}: {
  serum_na: number,
  weight_kg: number,
  sex: "male" | "female"
}) {
  const factor = sex === "male" ? 0.6 : 0.5;
  const tbw = weight_kg * factor;
  const deficit = tbw * (serum_na / 140 - 1);
  return { tbw, deficit };
}

register({
  id: "free_water_deficit",
  label: "Free Water Deficit",
  tags: ["nephrology", "electrolytes"],
  inputs: [
    { key: "serum_na", required: true },
    { key: "weight_kg", required: true },
    { key: "sex", required: true }
  ],
  run: ({ serum_na, weight_kg, sex }: { serum_na: number; weight_kg: number; sex: "male" | "female"; }) => {
    const r = calc_free_water_deficit({ serum_na, weight_kg, sex });
    const notes = [`TBW≈${Math.round(r.tbw)} L`];
    return { id: "free_water_deficit", label: "Free Water Deficit", value: r.deficit, unit: "L", precision: 1, notes, extra: r };
  },
});
