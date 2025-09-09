import { register } from "../registry";

// Calculated osmolality with EtOH support:
// Osm(calc) = 2*Na + glucose/18 + BUN/2.8 + ethanol/3.7 (mg/dL)
register({
  id: "osmolality_calc",
  label: "Calculated osmolality",
  inputs: [
    { key: "Na", required: true },
    { key: "glucose_mgdl" },
    { key: "BUN" },
    { key: "ethanol_mgdl" },
  ],
  run: ({ Na, glucose_mgdl, BUN, ethanol_mgdl }) => {
    const glu = glucose_mgdl ?? 0;
    const bun = BUN ?? 0;
    const et  = ethanol_mgdl ?? 0;
    const val = 2 * Na! + (glu / 18) + (bun / 2.8) + (et / 3.7);
    return { id: "osmolality_calc", label: "Calculated osmolality", value: val, unit: "mOsm/kg", precision: 0 };
  },
});

// Osmolal gap (if measured osmolality available)
register({
  id: "osmolal_gap",
  label: "Osmolal gap",
  inputs: [
    { key: "Na", required: true },
    { key: "glucose_mgdl" },
    { key: "BUN" },
    { key: "ethanol_mgdl" },
    { key: "osm_meas", required: true },
  ],
  run: (inp) => {
    const calc = 2 * inp.Na! + ((inp.glucose_mgdl ?? 0) / 18) + ((inp.BUN ?? 0) / 2.8) + ((inp.ethanol_mgdl ?? 0) / 3.7);
    const gap = (inp.osm_meas!) - calc;
    const notes: string[] = [];
    if (gap > 10) notes.push("elevated gap");
    return { id: "osmolal_gap", label: "Osmolal gap", value: gap, unit: "mOsm/kg", precision: 0, notes };
  },
});

