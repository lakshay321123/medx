import { register } from "../registry";

export function runOsmAdvanced(i:{ sodium_mEq_L:number, bun_mg_dL:number, glucose_mg_dL:number, ethanol_mg_dL?:number, methanol_mg_dL?:number, ethylene_glycol_mg_dL?:number, isopropanol_mg_dL?:number }){
  if ([i.sodium_mEq_L,i.bun_mg_dL,i.glucose_mg_dL].some(v=>v==null || !isFinite(v as number))) return null;
  let osm = 2*i.sodium_mEq_L + i.bun_mg_dL/2.8 + i.glucose_mg_dL/18;
  if (i.ethanol_mg_dL!=null) osm += i.ethanol_mg_dL/3.7;
  if (i.methanol_mg_dL!=null) osm += i.methanol_mg_dL/3.2;
  if (i.ethylene_glycol_mg_dL!=null) osm += i.ethylene_glycol_mg_dL/3.2;
  if (i.isopropanol_mg_dL!=null) osm += i.isopropanol_mg_dL/6.0;
  return { serum_osm_calc_mOsm_kg: Number(osm.toFixed(1)) };
}
register({ id:"osmolality_advanced", label:"Serum osmolality (advanced tox)", inputs:[
  {key:"sodium_mEq_L",required:true},{key:"bun_mg_dL",required:true},{key:"glucose_mg_dL",required:true},
  {key:"ethanol_mg_dL"},{key:"methanol_mg_dL"},{key:"ethylene_glycol_mg_dL"},{key:"isopropanol_mg_dL"}
], run: runOsmAdvanced as any });
