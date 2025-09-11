export type ParklandInputs = { weight_kg: number; tbsa_percent: number };

export function calc_parkland(i: ParklandInputs): { total_ml: number; first8h_ml: number; next16h_ml: number } {
  const total = 4 * i.weight_kg * i.tbsa_percent;
  return { total_ml: total, first8h_ml: total/2, next16h_ml: total/2 };
}

const def = {
  id: "parkland",
  label: "Parkland Formula (burn resuscitation)",
  inputs: [
    { id: "weight_kg", label: "Weight (kg)", type: "number", min: 1, max: 400 },
    { id: "tbsa_percent", label: "TBSA burn (%)", type: "number", min: 0, max: 100 }
  ],
  run: (args: ParklandInputs) => {
    const r = calc_parkland(args);
    const notes = ["Give first half in 8h from time of burn"];
    return { id: "parkland", label: "Parkland Fluid", value: r.total_ml, unit: "mL/24h", precision: 0, notes, extra: r };
  },
};

export default def;
