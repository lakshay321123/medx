import { register } from "../registry";

export function runAdjBW({ actual_kg, ibw_kg, factor=0.4 }:{ actual_kg:number, ibw_kg:number, factor?:number }) {
  if ([actual_kg, ibw_kg].some(v=>v==null)) return null;
  const adj = ibw_kg + factor*(actual_kg - ibw_kg);
  return { adj_bw_kg: Number(adj.toFixed(1)) };
}
export function runBSA({ weight_kg, height_cm }:{ weight_kg:number, height_cm:number }) {
  if ([weight_kg,height_cm].some(v=>v==null)) return null;
  const bsa = 0.007184 * (weight_kg**0.425) * (height_cm**0.725);
  return { bsa_m2: Number(bsa.toFixed(2)) };
}

abw_adjustedbsa_dubois