import { register } from "../registry";
/**
 * Calculated Serum Osmolality (mOsm/kg) = 2*Na + Glucose/18 + BUN/2.8
 */
export function calc_serum_osm({ Na, glucose_mg_dl, bun_mg_dl }:
  { Na: number, glucose_mg_dl: number, bun_mg_dl: number }) {
  if (Na == null || glucose_mg_dl == null || bun_mg_dl == null) return null;
  return 2 * Na + glucose_mg_dl / 18 + bun_mg_dl / 2.8;
}

register({
  id: "serum_osm",
  label: "Calculated Serum Osmolality",
  tags: ["electrolytes", "toxicology"],
  inputs: [
    { key: "Na", required: true },
    { key: "glucose_mg_dl", required: true },
    { key: "bun_mg_dl", required: true },
  ],
  run: ({ Na, glucose_mg_dl, bun_mg_dl }) => {
    const v = calc_serum_osm({ Na, glucose_mg_dl, bun_mg_dl });
    if (v == null) return null;
    return { id: "serum_osm", label: "Calculated Serum Osmolality", value: v, unit: "mOsm/kg", precision: 0, notes: [] };
  },
});
