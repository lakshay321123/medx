// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.


export type BSAInputs = {
  height_cm: number;
  weight_kg: number;
};

export function calc_bsa_mosteller({ height_cm, weight_kg }: BSAInputs): number {
  return Math.sqrt((height_cm * weight_kg) / 3600);
}

const def = {
  id: "bsa_mosteller",
  label: "Body Surface Area (Mosteller)",
  inputs: [
    { id: "height_cm", label: "Height (cm)", type: "number", min: 30, max: 250 },
    { id: "weight_kg", label: "Weight (kg)", type: "number", min: 1, max: 300 }
  ],
  run: (args: BSAInputs) => {
    const v = calc_bsa_mosteller(args);
    return { id: "bsa_mosteller", label: "BSA (Mosteller)", value: v, unit: "m²", precision: 2, notes: [] };
  },
};

export default def;
