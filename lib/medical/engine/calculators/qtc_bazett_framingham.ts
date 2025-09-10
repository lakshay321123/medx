/**
 * QTc calculators
 * Inputs: QT_ms, HR_bpm
 * RR(s) = 60/HR
 * Bazett: QTcB = QT / sqrt(RR)
 * Framingham: QTcF = QT + 0.154*(1 - RR)  (QT in seconds)
 */
export interface QTcInput { qt_ms: number; hr_bpm: number; }
export interface QTcResult { qtc_bazett_ms: number; qtc_framingham_ms: number; rr_s: number; }
export function runQTc(i: QTcInput): QTcResult {
  const rr = 60 / i.hr_bpm;
  const qt_s = i.qt_ms / 1000;
  const qtc_b = qt_s / Math.sqrt(rr);
  const qtc_f = qt_s + 0.154*(1 - rr);
  return {
    qtc_bazett_ms: qtc_b * 1000,
    qtc_framingham_ms: qtc_f * 1000,
    rr_s: rr
  };
}
