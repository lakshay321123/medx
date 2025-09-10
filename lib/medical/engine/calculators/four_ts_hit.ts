import { register } from "../registry";

export function runFourTs(i:{ platelet_drop_pct:number, nadir_k_uL:number, timing_days:number, thrombosis_or_skin:boolean, other_causes_likely:boolean }){
  if (Object.values(i).some(v=>v==null || !isFinite(v as number))) return null;
  let pts=0;
  // Thrombocytopenia
  if (i.platelet_drop_pct>=50 && i.nadir_k_uL>=20) pts+=2;
  else if (i.platelet_drop_pct>=30) pts+=1;
  // Timing
  if (i.timing_days>=5 && i.timing_days<=10) pts+=2;
  else if (i.timing_days>10 || i.timing_days==4) pts+=1;
  // Thrombosis or skin necrosis
  if (i.thrombosis_or_skin) pts+=2;
  // Other causes
  if (!i.other_causes_likely) pts+=2;
  else if (i.other_causes_likely) pts+=1;
  const band = pts>=6?"high": pts>=4?"intermediate":"low";
  return { FourTs: pts, probability_band: band };
}
register({ id:"four_ts_hit", label:"4Ts score (HIT)", inputs:[
  {key:"platelet_drop_pct",required:true},{key:"nadir_k_uL",required:true},{key:"timing_days",required:true},{key:"thrombosis_or_skin",required:true},{key:"other_causes_likely",required:true}
], run: runFourTs as any });
