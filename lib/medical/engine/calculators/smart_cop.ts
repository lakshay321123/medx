import { register } from "../registry";

/**
 * SMART‑COP: SBP, Multilobar CXR, Albumin, RR, Tachycardia, Confusion, Oxygenation, pH.
 */
export function runSMARTCOP(i:{ sbp_mmHg:number, multilobar_involvement:boolean, albumin_g_L:number, rr_bpm:number, hr_bpm:number, confusion:boolean, pao2_mmHg?:number, fio2?:number, sao2_pct?:number, age_lt50:boolean, ph:number }){
  if (i==null || [i.sbp_mmHg,i.albumin_g_L,i.rr_bpm,i.hr_bpm,i.ph].some(v=>v==null || !isFinite(v as number))) return null;
  let pts=0;
  if (i.sbp_mmHg<90) pts+=2;
  if (i.multilobar_involvement) pts+=1;
  if (i.albumin_g_L<35) pts+=1;
  if ((i.age_lt50 && i.rr_bpm>=25) || (!i.age_lt50 && i.rr_bpm>=30)) pts+=1;
  if (i.hr_bpm>=125) pts+=1;
  if (i.confusion) pts+=1;
  let ox=false;
  if (i.pao2_mmHg!=null && isFinite(i.pao2_mmHg) && i.fio2!=null && isFinite(i.fio2)){
    const pfr=i.pao2_mmHg/i.fio2;
    ox = (i.age_lt50 ? pfr<333 : pfr<250);
  } else if (i.sao2_pct!=null && isFinite(i.sao2_pct)){
    ox = (i.age_lt50 ? i.sao2_pct<93 : i.sao2_pct<90);
  }
  if (ox) pts+=2;
  if (i.ph<7.35) pts+=2;
  let band="low"; if (pts>=5) band="high"; else if (pts>=3) band="moderate";
  return { SMART_COP: pts, risk_band: band };
}
register({ id:"smart_cop", label:"SMART‑COP", inputs:[
  {key:"sbp_mmHg",required:true},{key:"multilobar_involvement",required:true},{key:"albumin_g_L",required:true},
  {key:"rr_bpm",required:true},{key:"hr_bpm",required:true},{key:"confusion",required:true},{key:"pao2_mmHg"},{key:"fio2"},{key:"sao2_pct"},
  {key:"age_lt50",required:true},{key:"ph",required:true}
], run: runSMARTCOP as any });
