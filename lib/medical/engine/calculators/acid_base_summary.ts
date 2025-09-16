import { register } from "../registry";

register({
  id: "acid_base_summary",
  label: "Acid–base summary",
  tags: ["acid-base"],
  inputs: [
    { key: "Na", required: true },
    { key: "Cl", required: true },
    { key: "HCO3", required: true },
    { key: "albumin" },
    { key: "pH" },
    { key: "pCO2" },
    { key: "glucose_mgdl" },
    { key: "BUN" },
    { key: "Osm_measured" },
  ],
  run: ({ Na, Cl, HCO3, albumin, pH, pCO2, glucose_mgdl, BUN, Osm_measured }) => {
    if (Na == null || Cl == null || HCO3 == null) return null;

    const ag = Na - (Cl + HCO3);
    const agc = albumin != null ? ag + 2.5 * (4 - albumin) : ag;
    const exp = 1.5 * HCO3 + 8;
    const comp = (pCO2 != null)
      ? (pCO2 < exp - 2 ? "± resp. alkalosis" : pCO2 > exp + 2 ? "± resp. acidosis" : "appropriate")
      : "respiratory compensation not evaluated";
    const calcOsm = (glucose_mgdl != null && BUN != null) ? (2 * Na + glucose_mgdl / 18 + BUN / 2.8) : undefined;
    const gap = (calcOsm != null && Osm_measured != null) ? (Osm_measured - calcOsm) : undefined;

    const notes: string[] = [];
    if (ag > 12) notes.push("HAGMA");
    if (albumin != null && agc > 12) notes.push("HAGMA (albumin-corrected)");
    notes.push(`Winter’s exp ~${exp.toFixed(1)} mmHg (${comp})`);
    if (gap != null) notes.push(`Osm gap ${gap.toFixed(0)} mOsm/kg`);

    return { id: "acid_base_summary", label: "Acid–base summary", value: Number(agc.toFixed(1)), unit: "AG (corr) mmol/L", precision: 1, notes };
  },
});
