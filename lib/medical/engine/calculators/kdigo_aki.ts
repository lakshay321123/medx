
import { register } from "../registry";

export type KDIGOInputs = {
  creat_mg_dL_current:number,
  creat_mg_dL_baseline:number,
  creat_rise_mg_dL_48h?:number, // delta within 48h (optional if ratio available)
  urine_mL_kg_h_6h?:number,
  urine_mL_kg_h_12h?:number,
  urine_mL_kg_h_24h?:number,
  rrt_initiated?:boolean
};

export function runKDIGO(i:KDIGOInputs){
  if (i==null) return null;
  const ratio = (i.creat_mg_dL_current && i.creat_mg_dL_baseline) ? (i.creat_mg_dL_current / i.creat_mg_dL_baseline) : NaN;
  const delta48 = i.creat_rise_mg_dL_48h ?? (isFinite(ratio)? i.creat_mg_dL_current - i.creat_mg_dL_baseline : NaN);
  let stage = 0;
  if (i.rrt_initiated) stage = 3;
  else {
    if ((ratio>=3) || (i.creat_mg_dL_current>=4.0 && (i.creat_mg_dL_baseline>0))): stage = 3
    elif (ratio>=2): stage = max(stage,2)
    elif (ratio>=1.5) || (delta48>=0.3): stage = max(stage,1)
  }
  function max(a:number,b:number){ return a>b?a:b; }
  // urine outputs
  if (i.urine_mL_kg_h_24h!=null && i.urine_mL_kg_h_24h<0.3): stage = max(stage,3)
  elif (i.urine_mL_kg_h_12h!=null && i.urine_mL_kg_h_12h<0.5): stage = max(stage,2)
  elif (i.urine_mL_kg_h_6h!=null && i.urine_mL_kg_h_6h<0.5): stage = max(stage,1)

  return { KDIGO_stage: stage, ratio: isFinite(ratio)? Number(ratio.toFixed(2)): null, delta48: isFinite(delta48)? Number(delta48.toFixed(2)): null };
}

register({ id:"kdigo_aki", label:"AKI staging (KDIGO)", inputs:[
  {key:"creat_mg_dL_current",required:true},{key:"creat_mg_dL_baseline",required:true},{key:"creat_rise_mg_dL_48h"},
  {key:"urine_mL_kg_h_6h"},{key:"urine_mL_kg_h_12h"},{key:"urine_mL_kg_h_24h"},{key:"rrt_initiated"}
], run: runKDIGO as any });
