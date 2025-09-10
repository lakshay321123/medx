import { register } from "../registry";

export interface OsmInput {
  Na_meq_l: number;
  glucose_mg_dl: number;
  bun_mg_dl: number;
  ethanol_mg_dl?: number;
  measured_osm_mOsm_kg?: number;
}

export function runCalculatedOsm(i: OsmInput) {
  const ethanolTerm = (i.ethanol_mg_dl ?? 0) / 3.7;
  const calc = 2 * i.Na_meq_l + i.glucose_mg_dl / 18 + i.bun_mg_dl / 2.8 + ethanolTerm;
  const gap = i.measured_osm_mOsm_kg != null ? Number((i.measured_osm_mOsm_kg - calc).toFixed(1)) : undefined;
  return { calculated_mOsm_kg: Number(calc.toFixed(1)), osmolal_gap_mOsm_kg: gap };
}

register({
  id: "osmolality_and_gap",
  label: "Calculated osmolality ± gap",
  inputs: [
    { key: "Na_meq_l", required: true },
    { key: "glucose_mg_dl", required: true },
    { key: "bun_mg_dl", required: true },
    { key: "ethanol_mg_dl" },
    { key: "measured_osm_mOsm_kg" },
  ],
  run: (ctx) => {
    const { Na_meq_l, glucose_mg_dl, bun_mg_dl, ethanol_mg_dl, measured_osm_mOsm_kg } = ctx as OsmInput;
    if (Na_meq_l == null || glucose_mg_dl == null || bun_mg_dl == null) return null;
    const r = runCalculatedOsm({ Na_meq_l, glucose_mg_dl, bun_mg_dl, ethanol_mg_dl, measured_osm_mOsm_kg });
    const notes: string[] = [];
    if (r.osmolal_gap_mOsm_kg != null) notes.push(`gap ${r.osmolal_gap_mOsm_kg} mOsm/kg`);
    return { id: "osmolality_and_gap", label: "Osmolality", value: r.calculated_mOsm_kg, unit: "mOsm/kg", notes, precision: 1 };
  },
});
