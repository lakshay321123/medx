import { register } from "../registry";

/** Devine Ideal Body Weight */
export function runIBW({ sex, height_cm }:{sex:"male"|"female", height_cm:number}) {
  if (!sex || height_cm==null) return null;
  const inches = height_cm / 2.54;
  const base = sex==="male" ? 50 : 45.5;
  const ibw = base + 2.3 * Math.max(0, inches - 60);
  return { ibw_kg: Number(ibw.toFixed(1)) };
}

/** Adjusted Body Weight for obesity */
export function runAdjBW({ actual_kg, ibw_kg, factor=0.4 }:{ actual_kg:number, ibw_kg:number, factor?:number }) {
  if ([actual_kg, ibw_kg].some(v=>v==null)) return null;
  const adj = ibw_kg + factor*(actual_kg - ibw_kg);
  return { adj_bw_kg: Number(adj.toFixed(1)) };
}

/** Body Surface Area (DuBois & DuBois) */
export function runBSA({ weight_kg, height_cm }:{ weight_kg:number, height_cm:number }) {
  if ([weight_kg,height_cm].some(v=>v==null)) return null;
  const bsa = 0.007184 * (weight_kg**0.425) * (height_cm**0.725);
  return { bsa_m2: Number(bsa.toFixed(2)) };
}

register({
  id: "ibw_devine",
  label: "Ideal Body Weight (Devine)",
  inputs: [
    { key: "sex", required: true },
    { key: "height_cm", required: true },
  ],
  run: (ctx) => {
    const r = runIBW(ctx as any);
    if (!r) return null;
    return { id: "ibw_devine", label: "Ideal Body Weight (Devine)", value: r.ibw_kg, unit: "kg", precision: 1, notes: [] };
  },
});

register({
  id: "abw_adjusted",
  label: "Adjusted Body Weight",
  inputs: [
    { key: "actual_kg", required: true },
    { key: "ibw_kg", required: true },
    { key: "factor" },
  ],
  run: (ctx) => {
    const r = runAdjBW(ctx as any);
    if (!r) return null;
    return { id: "abw_adjusted", label: "Adjusted Body Weight", value: r.adj_bw_kg, unit: "kg", precision: 1, notes: [] };
  },
});

register({
  id: "bsa_dubois",
  label: "Body Surface Area (DuBois)",
  inputs: [
    { key: "weight_kg", required: true },
    { key: "height_cm", required: true },
  ],
  run: (ctx) => {
    const r = runBSA(ctx as any);
    if (!r) return null;
    return { id: "bsa_dubois", label: "Body Surface Area (DuBois)", value: r.bsa_m2, unit: "m²", precision: 2, notes: [] };
  },
});
