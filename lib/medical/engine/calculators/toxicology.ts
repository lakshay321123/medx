import { register } from "../registry";

register({
  id: "calc_osm_with_ethanol",
  label: "Calculated osmolality (incl. EtOH)",
  inputs: [
    { key: "Na", required: true },
    { key: "glucose_mgdl" },
    { key: "glucose_mmol" },
    { key: "BUN" },
    { key: "ethanol_mgdl" },
  ],
  run: ({ Na, glucose_mgdl, glucose_mmol, BUN, ethanol_mgdl }) => {
    if (Na == null) return null;
    const glu = glucose_mgdl ?? (glucose_mmol != null ? glucose_mmol * 18 : 0);
    const bun = BUN ?? 0;
    const etoh = ethanol_mgdl != null ? ethanol_mgdl / 4.6 : 0;
    const val = 2 * Na + glu / 18 + bun / 2.8 + etoh;
    return {
      id: "calc_osm_with_ethanol",
      label: "Calculated osmolality (incl. ethanol)",
      value: val,
      unit: "mOsm/kg",
      precision: 0,
    };
  },
});

register({
  id: "osmolal_gap",
  label: "Osmolal gap",
  inputs: [
    { key: "measured_osm", required: true },
    { key: "Na", required: true },
    { key: "glucose_mgdl" },
    { key: "glucose_mmol" },
    { key: "BUN" },
    { key: "ethanol_mgdl" },
    { key: "pH" },
    { key: "anion_gap" },
  ],
  run: (ctx) => {
    const calc =
      2 * ctx.Na +
      ((ctx.glucose_mgdl ?? (ctx.glucose_mmol != null ? ctx.glucose_mmol * 18 : 0)) / 18) +
      ((ctx.BUN ?? 0) / 2.8) +
      (ctx.ethanol_mgdl != null ? ctx.ethanol_mgdl / 4.6 : 0);
    const gap = ctx.measured_osm - calc;
    const notes: string[] = [];
    if (gap >= 30) notes.push("high osmolal gap (≥30)");
    else if (gap >= 20) notes.push("elevated osmolal gap (20–29)");
    if (ctx.anion_gap != null && ctx.anion_gap >= 16) notes.push("elevated anion gap");
    if (ctx.pH != null && ctx.pH < 7.3) notes.push("acidemia");
    if (gap >= 30 || (gap >= 20 && ctx.anion_gap >= 16 && ctx.pH < 7.3))
      notes.push("consider toxic alcohol; treat per protocol");
    return { id: "osmolal_gap", label: "Osmolal gap", value: gap, unit: "mOsm/kg", precision: 0, notes };
  },
});
