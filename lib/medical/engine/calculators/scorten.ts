import { register } from "../registry";

export function runSCORTEN(i:{ age_years:number, hr_bpm:number, cancer:boolean, epidermal_detachment_pct:number, serum_urea_mmol_L:number, glucose_mmol_L:number, bicarb_mEq_L:number }){
  if (Object.values(i).some(v=>v==null || !isFinite(v as number))) return null;
  let pts=0;
  pts += i.age_years>40?1:0;
  pts += i.cancer?1:0;
  pts += i.epidermal_detachment_pct>10?1:0;
  pts += i.serum_urea_mmol_L>10?1:0;
  pts += i.glucose_mmol_L>14?1:0;
  pts += i.hr_bpm>120?1:0;
  pts += i.bicarb_mEq_L<20?1:0;
  return { SCORTEN: pts };
}
register({ id:"scorten", label:"SCORTEN (TEN mortality)", inputs:[
  {key:"age_years",required:true},{key:"hr_bpm",required:true},{key:"cancer",required:true},{key:"epidermal_detachment_pct",required:true},
  {key:"serum_urea_mmol_L",required:true},{key:"glucose_mmol_L",required:true},{key:"bicarb_mEq_L",required:true}
], run: runSCORTEN as any });
