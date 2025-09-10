
// lib/medical/engine/calculators/qtc_extra.ts
// QTc formulas: Hodges (ms) and Framingham (ms).
// Inputs: QT in ms, HR in bpm.

export interface QTcInput { qt_ms: number; hr_bpm: number; }

export function qtcHodges(i: QTcInput): number {
  if (!isFinite(i.qt_ms) || !isFinite(i.hr_bpm) || i.hr_bpm <= 0) return NaN;
  return i.qt_ms + 1.75*(i.hr_bpm - 60);
}

export function qtcFramingham(i: QTcInput): number {
  if (!isFinite(i.qt_ms) || !isFinite(i.hr_bpm) || i.hr_bpm <= 0) return NaN;
  const rr_s = 60.0 / i.hr_bpm;
  const qt_s = i.qt_ms / 1000.0;
  const qtc_s = qt_s + 0.154*(1 - rr_s);
  return qtc_s * 1000.0;
}
