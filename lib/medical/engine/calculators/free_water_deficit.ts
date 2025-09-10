import { register } from "../registry";

/**
 * Free water deficit ≈ TBW * (Na/target - 1)
 * TBW: 0.6*wt (male), 0.5*wt (female). Default target Na=140.
 */
export type FWDInputs = { sex: "male"|"female"; weight_kg: number; Na_meq_l: number; target_na?: number };

export function runFWD({ sex, weight_kg, Na_meq_l, target_na=140 }: FWDInputs) {
  if (!sex || [weight_kg,Na_meq_l,target_na].some(v=>v==null)) return null;
  const tbw = (sex === "female" ? 0.5 : 0.6) * weight_kg;
  const deficit = tbw * (Na_meq_l/target_na - 1);
  return { free_water_deficit_L: deficit };
}

register({
  id: "free_water_deficit",
  label: "Free water deficit",
  inputs: [
    { key: "sex", required: true },
    { key: "weight_kg", required: true },
    { key: "Na_meq_l", required: true },
    { key: "target_na" },
  ],
  run: (ctx) => {
    const r = runFWD(ctx as FWDInputs);
    if (!r) return null;
    return { id: "free_water_deficit", label: "Free water deficit", value: Number(r.free_water_deficit_L.toFixed(1)), unit: "L", precision: 1, notes: [] };
  },
});
