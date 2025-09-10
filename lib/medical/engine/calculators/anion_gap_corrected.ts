import { register } from "../registry";

/**
 * Corrected Anion Gap for albumin
 * Corrected AG = AG + 2.5 * (4 - albumin_g_dl)
 */
export function calc_anion_gap_corrected({
  Na, Cl, HCO3, albumin_g_dl
}: {
  Na: number,
  Cl: number,
  HCO3: number,
  albumin_g_dl: number
}) {
  const ag = Na - (Cl + HCO3);
  const corrected = ag + 2.5 * (4 - albumin_g_dl);
  return { ag, corrected };
}

register({
  id: "anion_gap_corrected",
  label: "Corrected Anion Gap",
  tags: ["electrolytes", "acid-base"],
  inputs: [
    { key: "Na", required: true },
    { key: "Cl", required: true },
    { key: "HCO3", required: true },
    { key: "albumin_g_dl", required: true }
  ],
  run: ({ Na, Cl, HCO3, albumin_g_dl }: { Na: number; Cl: number; HCO3: number; albumin_g_dl: number; }) => {
    const r = calc_anion_gap_corrected({ Na, Cl, HCO3, albumin_g_dl });
    const notes = [`AG=${Math.round(r.ag)}`, `corrected for albumin`];
    return { id: "anion_gap_corrected", label: "Corrected Anion Gap", value: r.corrected, unit: "mEq/L", precision: 0, notes, extra: r };
  },
});
