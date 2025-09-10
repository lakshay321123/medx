
import { register } from "../registry";

export function runAcetaminophenNomogramFlag({ time_hr_since_ingest, level_ug_mL }:{ time_hr_since_ingest:number, level_ug_mL:number }){
  if ([time_hr_since_ingest,level_ug_mL].some(v=>v==null || !isFinite(v as number))) return null;
  if (time_hr_since_ingest < 4) return { flag: "too_early_to_plot" };
  // Approximate "150 line": ~150 at 4h, ~100 at 8h, ~50 at 12h
  const slope = -12.5; // ug/mL per hour between 4 and 12 hours (150 -> 50)
  const thr = time_hr_since_ingest<=12 ? (150 + slope*(time_hr_since_ingest-4)) : max(25, 50 + slope*(time_hr_since_ingest-12)); // floor to ~25 later
  function max(a:number,b:number){ return a>b?a:b; }
  const above = level_ug_mL >= thr;
  return { above_line: above, threshold_ug_mL: Number(thr.toFixed(0)) };
}

export function runToxicAlcoholSupport({ osm_gap_mOsm_kg, anion_gap_mEq_L, pH }:{ osm_gap_mOsm_kg:number, anion_gap_mEq_L:number, pH:number }){
  if ([osm_gap_mOsm_kg,anion_gap_mEq_L,pH].some(v=>v==null || !isFinite(v as number))) return null;
  const supportive = (osm_gap_mOsm_kg>10) && (anion_gap_mEq_L>12 || pH<7.3);
  return { supportive_flag: supportive };
}

export function runLactateGap({ arterial_mmol_L, venous_mmol_L }:{ arterial_mmol_L:number, venous_mmol_L:number }){
  if ([arterial_mmol_L,venous_mmol_L].some(v=>v==null || !isFinite(v as number))) return null;
  const gap = arterial_mmol_L - venous_mmol_L;
  return { lactate_gap_mmol_L: Number(gap.toFixed(1)) };
}

register({ id:"acetaminophen_nomogram_flag", label:"Acetaminophen nomogram (supportive flag)", inputs:[{key:"time_hr_since_ingest",required:true},{key:"level_ug_mL",required:true}], run: runAcetaminophenNomogramFlag as any });
register({ id:"toxic_alcohol_support", label:"Toxic alcohol ingestion (supportive)", inputs:[{key:"osm_gap_mOsm_kg",required:true},{key:"anion_gap_mEq_L",required:true},{key:"pH",required:true}], run: runToxicAlcoholSupport as any });
register({ id:"lactate_gap", label:"Lactate gap (A−V)", inputs:[{key:"arterial_mmol_L",required:true},{key:"venous_mmol_L",required:true}], run: runLactateGap as any });
