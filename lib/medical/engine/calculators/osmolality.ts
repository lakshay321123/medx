
import { register } from "../registry";

export type OsmInputs = { Na: number, glucose_mg_dL: number, BUN_mg_dL: number, ethanol_mg_dL?: number };
export function runSerumOsmCalc({ Na, glucose_mg_dL, BUN_mg_dL, ethanol_mg_dL=0 }: OsmInputs) {
  if ([Na,glucose_mg_dL,BUN_mg_dL,ethanol_mg_dL].some(v=>v==null || !isFinite(v as number))) return null;
  const osm = 2*Na + glucose_mg_dL/18 + BUN_mg_dL/2.8 + ethanol_mg_dL/3.7;
  return { serum_osm_mOsm_kg: Number(osm.toFixed(1)) };
}

export function runEffectiveOsm({ Na, glucose_mg_dL }: { Na:number, glucose_mg_dL:number }) {
  if ([Na,glucose_mg_dL].some(v=>v==null || !isFinite(v as number))) return null;
  const eff = 2*Na + glucose_mg_dL/18;
  return { effective_osm_mOsm_kg: Number(eff.toFixed(1)) };
}

export function runOsmolarGap({ measured_osm_mOsm_kg, serum_osm_mOsm_kg }: { measured_osm_mOsm_kg:number, serum_osm_mOsm_kg:number }) {
  if ([measured_osm_mOsm_kg,serum_osm_mOsm_kg].some(v=>v==null || !isFinite(v as number))) return null;
  const gap = measured_osm_mOsm_kg - serum_osm_mOsm_kg;
  return { osmolar_gap_mOsm_kg: Number(gap.toFixed(1)) };
}

register({ id:"serum_osm_calc", label:"Serum osmolality (calculated)", inputs:[{key:"Na",required:true},{key:"glucose_mg_dL",required:true},{key:"BUN_mg_dL",required:true},{key:"ethanol_mg_dL"}], run: runSerumOsmCalc as any });
register({ id:"effective_osm", label:"Effective osmolality", inputs:[{key:"Na",required:true},{key:"glucose_mg_dL",required:true}], run: runEffectiveOsm as any });
register({ id:"osmolar_gap", label:"Osmolar gap", inputs:[{key:"measured_osm_mOsm_kg",required:true},{key:"serum_osm_mOsm_kg",required:true}], run: runOsmolarGap as any });
