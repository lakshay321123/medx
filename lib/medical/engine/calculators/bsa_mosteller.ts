export type BSAInputs = { height_cm: number; weight_kg: number };

export function calc_bsa_mosteller(i: BSAInputs): number {
  if (i.height_cm <= 0 || i.weight_kg <= 0) return NaN;
  return Math.sqrt((i.height_cm * i.weight_kg) / 3600);
}

const def = {
  id: "bsa_mosteller",
  label: "Body Surface Area (Mosteller)",
  inputs: [
    { id: "height_cm", label: "Height (cm)", type: "number", min: 1, max: 300 },
    { id: "weight_kg", label: "Weight (kg)", type: "number", min: 1, max: 400 }
  ],
  run: (args: BSAInputs) => {
    const v = calc_bsa_mosteller(args);
    return { id: "bsa_mosteller", label: "BSA (Mosteller)", value: v, unit: "m²", precision: 2, notes: [] };
  },
};

export default def;
