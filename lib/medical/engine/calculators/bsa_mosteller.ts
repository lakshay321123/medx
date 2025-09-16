export type BSAInputs = { height_cm:number; weight_kg:number };

export function calc_bsa_mosteller(i: BSAInputs): number {
  return Math.sqrt((i.height_cm * i.weight_kg) / 3600);
}

const def = {
  id: "bsa_mosteller",
  label: "Body Surface Area (Mosteller)",
  inputs: [
    { id: "height_cm", label: "Height", unit: "cm", type: "number", min: 50, max: 250 },
    { id: "weight_kg", label: "Weight", unit: "kg", type: "number", min: 1, max: 400 }
  ],
  run: (args: BSAInputs) => {
    const v = calc_bsa_mosteller(args);
    return { id: "bsa_mosteller", label: "BSA (Mosteller)", value: v, unit: "m²", precision: 2, notes: [] };
  },
};

export default def;
