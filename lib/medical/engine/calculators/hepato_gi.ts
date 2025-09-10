
import { register } from "../registry";

export function runAPRI({ AST_IU_L, ULN_AST_IU_L, platelets_k_uL }:{ AST_IU_L:number, ULN_AST_IU_L:number, platelets_k_uL:number }){
  if ([AST_IU_L,ULN_AST_IU_L,platelets_k_uL].some(v=>v==null || !isFinite(v as number) || ULN_AST_IU_L<=0 || platelets_k_uL<=0)) return null;
  const apri = (AST_IU_L/ULN_AST_IU_L)*100 / platelets_k_uL;
  return { APRI: Number(apri.toFixed(2)) };
}

export function runFIB4({ age_y, AST_IU_L, ALT_IU_L, platelets_k_uL }:{ age_y:number, AST_IU_L:number, ALT_IU_L:number, platelets_k_uL:number }){
  if ([age_y,AST_IU_L,ALT_IU_L,platelets_k_uL].some(v=>v==null || !isFinite(v as number) || ALT_IU_L<=0 || platelets_k_uL<=0)) return null;
  const fib4 = (age_y * AST_IU_L) / (platelets_k_uL * Math.sqrt(ALT_IU_L));
  return { FIB4: Number(fib4.toFixed(2)) };
}

export function runMaddreyDF({ PT_patient_s, PT_control_s, bilirubin_mg_dL }:{ PT_patient_s:number, PT_control_s:number, bilirubin_mg_dL:number }){
  if ([PT_patient_s,PT_control_s,bilirubin_mg_dL].some(v=>v==null || !isFinite(v as number))) return null;
  const df = 4.6 * (PT_patient_s - PT_control_s) + bilirubin_mg_dL;
  return { Maddrey_DF: Number(df.toFixed(1)) };
}

register({ id:"apri_index", label:"APRI index", inputs:[{key:"AST_IU_L",required:true},{key:"ULN_AST_IU_L",required:true},{key:"platelets_k_uL",required:true}], run: runAPRI as any });
register({ id:"fib4_index", label:"FIB-4 index", inputs:[{key:"age_y",required:true},{key:"AST_IU_L",required:true},{key:"ALT_IU_L",required:true},{key:"platelets_k_uL",required:true}], run: runFIB4 as any });
register({ id:"maddrey_df", label:"Maddrey Discriminant Function", inputs:[{key:"PT_patient_s",required:true},{key:"PT_control_s",required:true},{key:"bilirubin_mg_dL",required:true}], run: runMaddreyDF as any });
