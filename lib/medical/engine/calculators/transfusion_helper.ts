import { register } from "../registry";

/**
 * Transfusion thresholds helper (adult, general). Returns suggested thresholds based on common guidance.
 */
export function runTransfusionHelper(i:{ hgb_g_dL?:number, plt_k_uL?:number, active_bleeding:boolean, acs:boolean, neurosurgery_or_eye:boolean }){
  const notes:string[]=[];
  if (i.hgb_g_dL!=null && isFinite(i.hgb_g_dL)){
    if (i.acs) notes.push(i.hgb_g_dL<8? "Consider RBC transfusion (Hgb < 8 in ACS)" : "No routine RBC transfusion");
    else notes.push(i.hgb_g_dL<7? "Consider RBC transfusion (Hgb < 7)" : "Restrictive strategy; no routine RBC transfusion");
  }
  if (i.plt_k_uL!=null && isFinite(i.plt_k_uL)){
    if (i.active_bleeding) notes.push(i.plt_k_uL<50? "Platelets (<50k with bleeding)" : "Platelets likely not indicated");
    else if (i.neurosurgery_or_eye) notes.push(i.plt_k_uL<100? "Platelets (<100k for neurosurgery/ocular)" : "No platelets");
    else notes.push(i.plt_k_uL<10? "Platelets (<10k prophylaxis)" : "No platelets");
  }
  return { recommendations: notes };
}
register({ id:"transfusion_helper", label:"Transfusion thresholds helper", inputs:[
  {key:"hgb_g_dL"},{key:"plt_k_uL"},{key:"active_bleeding",required:true},{key:"acs",required:true},{key:"neurosurgery_or_eye",required:true}
], run: runTransfusionHelper as any });
