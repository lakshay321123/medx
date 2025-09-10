import { register } from "../registry";

/**
 * Body Surface Area (Mosteller) = sqrt((height_cm * weight_kg) / 3600)
 */
export function calc_bsa_mosteller({
  height_cm, weight_kg
}: {
  height_cm: number,
  weight_kg: number
}) {
  const bsa = Math.sqrt((height_cm * weight_kg) / 3600);
  return bsa;
}

register({
  id: "bsa_mosteller",
  label: "Body Surface Area (Mosteller)",
  tags: ["dosing"],
  inputs: [
    { key: "height_cm", required: true },
    { key: "weight_kg", required: true }
  ],
  run: ({ height_cm, weight_kg }: { height_cm: number; weight_kg: number; }) => {
    const v = calc_bsa_mosteller({ height_cm, weight_kg });
    return { id: "bsa_mosteller", label: "Body Surface Area (Mosteller)", value: v, unit: "m²", precision: 2, notes: [] };
  },
});
