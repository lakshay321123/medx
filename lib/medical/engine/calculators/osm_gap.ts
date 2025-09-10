import { register } from "../registry";
/**
 * Osmolal Gap = measured_osm - calculated_osm
 * calculated_osm = 2*Na + Glucose/18 + BUN/2.8
 */
export function calc_osmolal_gap({ measured_osm, Na, glucose_mg_dl, bun_mg_dl }:
  { measured_osm: number, Na: number, glucose_mg_dl: number, bun_mg_dl: number }) {
  if (measured_osm == null) return null;
  if (Na == null || glucose_mg_dl == null || bun_mg_dl == null) return null;
  const calc = 2 * Na + glucose_mg_dl / 18 + bun_mg_dl / 2.8;
  return measured_osm - calc;
}

function interpretGap(gap: number): string {
  if (gap == null) return "";
  if (gap >= 10) return "elevated gap — consider toxic alcohols, mannitol, osmotically active agents";
  if (gap <= -10) return "low gap — recheck inputs/labs";
  return "normal";
}

register({
  id: "osm_gap",
  label: "Osmolal Gap",
  tags: ["toxicology", "electrolytes"],
  inputs: [
    { key: "measured_osm", required: true },
    { key: "Na", required: true },
    { key: "glucose_mg_dl", required: true },
    { key: "bun_mg_dl", required: true },
  ],
  run: ({ measured_osm, Na, glucose_mg_dl, bun_mg_dl }) => {
    const v = calc_osmolal_gap({ measured_osm, Na, glucose_mg_dl, bun_mg_dl });
    if (v == null) return null;
    const notes = [interpretGap(v)];
    return { id: "osm_gap", label: "Osmolal Gap", value: v, unit: "mOsm/kg", precision: 0, notes };
  },
});
