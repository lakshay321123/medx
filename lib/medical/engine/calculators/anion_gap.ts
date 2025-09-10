import { register } from "../registry";

/**
 * Anion Gap = Na - (Cl + HCO3)
 */
export function calc_anion_gap({
  Na, Cl, HCO3
}: {
  Na: number,
  Cl: number,
  HCO3: number
}) {
  return Na - (Cl + HCO3);
}

register({
  id: "anion_gap",
  label: "Anion Gap",
  tags: ["electrolytes", "acid-base"],
  inputs: [
    { key: "Na", required: true },
    { key: "Cl", required: true },
    { key: "HCO3", required: true }
  ],
  run: ({ Na, Cl, HCO3 }: { Na: number; Cl: number; HCO3: number; }) => {
    const v = calc_anion_gap({ Na, Cl, HCO3 });
    return { id: "anion_gap", label: "Anion Gap", value: v, unit: "mEq/L", precision: 0, notes: [] };
  },
});
