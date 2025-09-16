import { register } from "../registry";

register({
  id: "delta_ratio_ag",
  label: "Delta ratio (AG)",
  tags: ["acid-base"],
  inputs: [
    { key: "Na", required: true },
    { key: "Cl", required: true },
    { key: "HCO3", required: true },
  ],
  run: ({ Na, Cl, HCO3 }) => {
    if (Na == null || Cl == null || HCO3 == null) return null;

    const AG = Na - (Cl + HCO3);
    const dr = (AG - 12) / (24 - HCO3);
    if (!isFinite(dr)) return null;

    const notes: string[] = [];
    if (AG <= 12) {
      notes.push("normal-gap (check Cl⁻/bicarbonate loss)"); // NGMA candidate
    } else if (dr < 0.4) {
      notes.push("HAGMA + concurrent NGMA");
    } else if (dr <= 2.0) {
      notes.push("isolated HAGMA");
    } else {
      notes.push("HAGMA + metabolic alkalosis (or chronic resp acidosis)");
    }

    return {
      id: "delta_ratio_ag",
      label: "Delta ratio (AG)",
      value: Number(dr.toFixed(2)),
      precision: 2,
      notes,
    };
  },
});
