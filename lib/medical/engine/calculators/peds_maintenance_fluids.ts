// Auto-generated. No placeholders. Typed run(args).
export type PedsFluidsInputs = { weight_kg: number };

export function calc_peds_maintenance_fluids({ weight_kg }: PedsFluidsInputs): { rate_ml_h: number; total_24h_ml: number } {
  let rate = 0;
  let w = weight_kg;
  if (w <= 10) rate = 4 * w;
  else if (w <= 20) rate = 4 * 10 + 2 * (w - 10);
  else rate = 4 * 10 + 2 * 10 + 1 * (w - 20);
  return { rate_ml_h: rate, total_24h_ml: rate * 24 };
}

const def = {
  id: "peds_maintenance_fluids",
  label: "Pediatric Maintenance Fluids (4-2-1)",
  inputs: [
    { id: "weight_kg", label: "Weight (kg)", type: "number", min: 1, max: 150 }
  ],
  run: (args: PedsFluidsInputs) => {
    const r = calc_peds_maintenance_fluids(args);
    const notes = [`24h total ${Math.round(r.total_24h_ml)} mL`];
    return { id: "peds_maintenance_fluids", label: "Peds Maintenance Fluids", value: r.rate_ml_h, unit: "mL/h", precision: 0, notes, extra: r };
  },
};

export default def;
