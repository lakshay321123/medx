// Batch 14 calculator
export type ParklandInputs = { weight_kg: number; tbsa_percent: number };

export function calc_parkland(i: ParklandInputs): { total_ml: number; first8h_ml: number; next16h_ml: number } {
  const total = 4 * i.weight_kg * i.tbsa_percent;
  return { total_ml: total, first8h_ml: total/2, next16h_ml: total/2 };
}

const def = {
  id: "parkland",
  label: "Parkland Formula (burn resuscitation)",
  inputs: [
    { id: "weight_kg", label: "Weight (kg)", type: "number", min: 1, max: 300 },
    { id: "tbsa_percent", label: "TBSA burned (%)", type: "number", min: 0, max: 100 }
  ],
  run: (args: ParklandInputs) => {
    const r = calc_parkland(args);
    const notes = [`First 8h: ${r.first8h_ml.toFixed(0)} mL`, `Next 16h: ${r.next16h_ml.toFixed(0)} mL`];
    return { id: "parkland", label: "Parkland Formula", value: r.total_ml, unit: "mL (24h)", precision: 0, notes, extra: r };
  },
};

export default def;
