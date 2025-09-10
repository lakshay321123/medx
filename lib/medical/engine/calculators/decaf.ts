import { register } from "../registry";

/**
 * DECAF score (AECOPD): Dyspnea (eMRCD 5a/5b), Eosinopenia (<0.05), Consolidation, Acidemia (pH<7.30), AF.
 */
export function runDECAF(i:{ emrcd_5a:boolean, emrcd_5b:boolean, eos_abs_k_uL:number, consolidation:boolean, ph:number, atrial_fibrillation:boolean }){
  if (i==null || i.eos_abs_k_uL==null || !isFinite(i.eos_abs_k_uL) || i.ph==null || !isFinite(i.ph)) return null;
  let pts = 0;
  if (i.emrcd_5a) pts+=1;
  if (i.emrcd_5b) pts+=2;
  if (i.eos_abs_k_uL<0.05) pts+=1;
  if (i.consolidation) pts+=1;
  if (i.ph<7.30) pts+=1;
  if (i.atrial_fibrillation) pts+=1;
  let band="low"; if (pts>=3) band="high"; else if (pts==2) band="intermediate";
  return { DECAF: pts, risk_band: band };
}
register({ id:"decaf_aecopd", label:"DECAF (AECOPD)", inputs:[
  {key:"emrcd_5a",required:true},{key:"emrcd_5b",required:true},{key:"eos_abs_k_uL",required:true},{key:"consolidation",required:true},{key:"ph",required:true},{key:"atrial_fibrillation",required:true}
], run: runDECAF as any });
