import { register } from "../registry";

/**
 * Burch‑Wartofsky (thyroid storm) — simplified rubric.
 */
export function runBurchWartofsky(i:{ temp_c:number, cns:boolean, gi_hepatic:boolean, tachycardia_bpm:number, heart_failure:boolean, afib:boolean, precipitating_event:boolean }){
  if (i==null || [i.temp_c,i.tachycardia_bpm].some(v=>v==null || !isFinite(v as number))) return null;
  let pts=0;
  // Temperature
  pts += i.temp_c>=41?30 : i.temp_c>=40?25 : i.temp_c>=39?20 : i.temp_c>=38?10 : i.temp_c>=37.2?5 : 0;
  // CNS
  pts += i.cns?20:0;
  // GI/hepatic
  pts += i.gi_hepatic?20:0;
  // Heart rate
  pts += i.tachycardia_bpm>=140?25 : i.tachycardia_bpm>=130?20 : i.tachycardia_bpm>=120?15 : i.tachycardia_bpm>=110?10 : i.tachycardia_bpm>=100?5 : 0;
  // Heart failure
  pts += i.heart_failure?10:0;
  // Atrial fibrillation
  pts += i.afib?10:0;
  // Precipitant
  pts += i.precipitating_event?10:0;
  const band = pts>=45?"thyroid storm likely": pts>=25?"impending storm":"unlikely";
  return { Burch_Wartofsky: pts, interpretation: band };
}
register({ id:"burch_wartofsky", label:"Burch‑Wartofsky (thyroid storm)", inputs:[
  {key:"temp_c",required:true},{key:"cns",required:true},{key:"gi_hepatic",required:true},{key:"tachycardia_bpm",required:true},
  {key:"heart_failure",required:true},{key:"afib",required:true},{key:"precipitating_event",required:true}
], run: runBurchWartofsky as any });
