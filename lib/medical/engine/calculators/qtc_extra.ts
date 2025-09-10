import { register } from "../registry";

/**
 * QTc extra formulas. Provide QT (ms) AND either HR or RR (s).
 */
export function runQTcHodges(i:{ qt_ms:number, hr_bpm?:number, rr_s?:number }){
  if (i==null || i.qt_ms==null || !isFinite(i.qt_ms)) return null;
  const rr = i.rr_s!=null && isFinite(i.rr_s) ? i.rr_s : (i.hr_bpm? 60/ i.hr_bpm : NaN);
  if (!isFinite(rr)) return { needs:["hr_bpm or rr_s"] };
  const qtc = i.qt_ms + 1.75 * ((60/rr) - 60);
  return { QTc_Hodges_ms: Number(qtc.toFixed(0)) };
}
export function runQTcFramingham(i:{ qt_ms:number, hr_bpm?:number, rr_s?:number }){
  if (i==null || i.qt_ms==null || !isFinite(i.qt_ms)) return null;
  const rr = i.rr_s!=null && isFinite(i.rr_s) ? i.rr_s : (i.hr_bpm? 60/ i.hr_bpm : NaN);
  if (!isFinite(rr)) return { needs:["hr_bpm or rr_s"] };
  const qtc = i.qt_ms + 154 * (1 - rr);
  return { QTc_Framingham_ms: Number(qtc.toFixed(0)) };
}
register({ id:"qtc_hodges", label:"QTc (Hodges)", inputs:[{key:"qt_ms",required:true},{key:"hr_bpm"},{key:"rr_s"}], run: runQTcHodges as any });
register({ id:"qtc_framingham", label:"QTc (Framingham)", inputs:[{key:"qt_ms",required:true},{key:"hr_bpm"},{key:"rr_s"}], run: runQTcFramingham as any });
