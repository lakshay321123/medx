
import { register } from "../registry";

export function runNonHDLCholesterol({ total_chol_mg_dL, hdl_mg_dL }:{ total_chol_mg_dL:number, hdl_mg_dL:number }){
  if ([total_chol_mg_dL,hdl_mg_dL].some(v=>v==null || !isFinite(v as number))) return null;
  return { non_hdl_mg_dL: Number((total_chol_mg_dL - hdl_mg_dL).toFixed(0)) };
}

export function runLDLHDLRatio({ ldl_mg_dL, hdl_mg_dL }:{ ldl_mg_dL:number, hdl_mg_dL:number }){
  if ([ldl_mg_dL,hdl_mg_dL].some(v=>v==null || !isFinite(v as number) || v<=0)) return null;
  return { ldl_hdl_ratio: Number((ldl_mg_dL/hdl_mg_dL).toFixed(2)) };
}

export function runTGHDLRatio({ tg_mg_dL, hdl_mg_dL }:{ tg_mg_dL:number, hdl_mg_dL:number }){
  if ([tg_mg_dL,hdl_mg_dL].some(v=>v==null || !isFinite(v as number) || v<=0)) return null;
  return { tg_hdl_ratio: Number((tg_mg_dL/hdl_mg_dL).toFixed(2)) };
}

export function runAtherogenicIndex({ tg_mg_dL, hdl_mg_dL }:{ tg_mg_dL:number, hdl_mg_dL:number }){
  if ([tg_mg_dL,hdl_mg_dL].some(v=>v==null || !isFinite(v as number) || v<=0)) return null;
  const ai = Math.log10(tg_mg_dL/hdl_mg_dL);
  return { atherogenic_index: Number(ai.toFixed(2)) };
}

export function runRemnantCholesterol({ total_chol_mg_dL, hdl_mg_dL, ldl_mg_dL }:{ total_chol_mg_dL:number, hdl_mg_dL:number, ldl_mg_dL:number }){
  if ([total_chol_mg_dL,hdl_mg_dL,ldl_mg_dL].some(v=>v==null || !isFinite(v as number))) return null;
  return { remnant_chol_mg_dL: Number((total_chol_mg_dL - hdl_mg_dL - ldl_mg_dL).toFixed(0)) };
}

register({ id:"non_hdl_cholesterol", label:"Non-HDL cholesterol", inputs:[{key:"total_chol_mg_dL",required:true},{key:"hdl_mg_dL",required:true}], run: runNonHDLCholesterol as any });
register({ id:"ldl_hdl_ratio", label:"LDL/HDL ratio", inputs:[{key:"ldl_mg_dL",required:true},{key:"hdl_mg_dL",required:true}], run: runLDLHDLRatio as any });
register({ id:"tg_hdl_ratio", label:"TG/HDL ratio", inputs:[{key:"tg_mg_dL",required:true},{key:"hdl_mg_dL",required:true}], run: runTGHDLRatio as any });
register({ id:"atherogenic_index_log_tg_hdl", label:"Atherogenic index (log TG/HDL)", inputs:[{key:"tg_mg_dL",required:true},{key:"hdl_mg_dL",required:true}], run: runAtherogenicIndex as any });
register({ id:"remnant_cholesterol", label:"Remnant cholesterol (TC−HDL−LDL)", inputs:[{key:"total_chol_mg_dL",required:true},{key:"hdl_mg_dL",required:true},{key:"ldl_mg_dL",required:true}], run: runRemnantCholesterol as any });
