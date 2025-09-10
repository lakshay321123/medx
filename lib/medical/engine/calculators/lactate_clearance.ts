import { register } from "../registry";

export function runLactateClearance(i:{ initial_mmol_L:number, later_mmol_L:number }){
  if (i==null || [i.initial_mmol_L,i.later_mmol_L].some(v=>v==null || !isFinite(v as number))) return null;
  const clr = ((i.initial_mmol_L - i.later_mmol_L) / i.initial_mmol_L) * 100;
  return { lactate_clearance_pct: Number(clr.toFixed(1)) };
}
register({ id:"lactate_clearance", label:"Lactate clearance %", inputs:[
  {key:"initial_mmol_L",required:true},{key:"later_mmol_L",required:true}
], run: runLactateClearance as any });
