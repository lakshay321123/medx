import { register } from "../registry";

export function runUAG(i:{ una_mEq_L:number, uka_mEq_L:number, ucl_mEq_L:number }){
  if (Object.values(i).some(v=>v==null || !isFinite(v as number))) return null;
  const uag = i.una_mEq_L + i.uka_mEq_L - i.ucl_mEq_L;
  return { urine_anion_gap_mEq_L: Number(uag.toFixed(1)) };
}
export function runFEPhos(i:{ uphos_mg_dL:number, sphos_mg_dL:number, ucr_mg_dL:number, scr_mg_dL:number }){
  if (Object.values(i).some(v=>v==null || !isFinite(v as number))) return null;
  const fe = (i.uphos_mg_dL * i.scr_mg_dL) / (i.sphos_mg_dL * i.ucr_mg_dL) * 100;
  return { FEPhos_pct: Number(fe.toFixed(1)) };
}
register({ id:"urine_anion_gap", label:"Urine anion gap (UAG)", inputs:[
  {key:"una_mEq_L",required:true},{key:"uka_mEq_L",required:true},{key:"ucl_mEq_L",required:true}
], run: runUAG as any });
register({ id:"fephos", label:"FE‑Phosphate", inputs:[
  {key:"uphos_mg_dL",required:true},{key:"sphos_mg_dL",required:true},{key:"ucr_mg_dL",required:true},{key:"scr_mg_dL",required:true}
], run: runFEPhos as any });
