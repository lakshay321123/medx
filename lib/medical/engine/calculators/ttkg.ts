import { register } from "../registry";

export interface TTKGInput {
  urine_k_meq_l: number;
  plasma_k_meq_l: number;
  urine_osm_mOsm_kg: number;
  plasma_osm_mOsm_kg: number;
}
export function runTTKG(i: TTKGInput) {
  const ttkg = (i.urine_k_meq_l / i.plasma_k_meq_l) * (i.plasma_osm_mOsm_kg / i.urine_osm_mOsm_kg);
  return { ttkg: Number(ttkg.toFixed(2)) };
}

register({
  id: "ttkg",
  label: "TTKG (trans-tubular K gradient)",
  inputs: [
    { key: "urine_k_meq_l", required: true },
    { key: "plasma_k_meq_l", required: true },
    { key: "urine_osm_mOsm_kg", required: true },
    { key: "plasma_osm_mOsm_kg", required: true },
  ],
  run: (ctx: any) => {
    const r = runTTKG(ctx as any);
    return { id: "ttkg", label: "TTKG", value: r.ttkg, precision: 2 };
  },
});
