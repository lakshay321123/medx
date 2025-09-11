// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.


export type ParklandInputs = {
  weight_kg: number;
  tbsa_percent: number; // 0-100
};

export function calc_parkland(i: ParklandInputs): { total_ml: number; first8_ml: number; next16_ml: number } {
  const total = 4 * i.weight_kg * i.tbsa_percent;
  return { total_ml: total, first8_ml: total/2, next16_ml: total/2 };
}

const def = {
  id: "parkland_formula",
  label: "Parkland Formula (Burns)",
  inputs: [
    { id: "weight_kg", label: "Weight (kg)", type: "number", min: 1, max: 300 },
    { id: "tbsa_percent", label: "TBSA burn (%)", type: "number", min: 0, max: 100 }
  ],
  run: (args: ParklandInputs) => {
    const r = calc_parkland(args);
    const notes = [`1st 8h: ${Math.round(r.first8_ml)} mL`, `Next 16h: ${Math.round(r.next16_ml)} mL`];
    return { id: "parkland_formula", label: "Parkland (24h total)", value: r.total_ml, unit: "mL", precision: 0, notes, extra: r };
  },
};

export default def;
