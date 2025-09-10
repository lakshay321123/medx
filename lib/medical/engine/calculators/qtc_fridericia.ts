/**
 * QTc Fridericia
 * RR seconds = 60 / HR
 * QTcF = QT / cube root of RR
 */
export interface QTcFInput { qt_ms: number; hr_bpm: number; }
export interface QTcFResult { qtc_fridericia_ms: number; rr_s: number; }
export function runQTcFridericia(i: QTcFInput): QTcFResult {
  const rr = 60 / i.hr_bpm;
  const qtc = (i.qt_ms / 1000) / Math.cbrt(rr) * 1000;
  return { qtc_fridericia_ms: qtc, rr_s: rr };
}
