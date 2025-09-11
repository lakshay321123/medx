// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.


export type QTcInputs = {
  qt_ms: number;
  rr_sec?: number;
  heart_rate_bpm?: number;
};

function rrFrom(i: QTcInputs): number {
  if (typeof i.rr_sec === "number") return i.rr_sec;
  if (typeof i.heart_rate_bpm === "number" && i.heart_rate_bpm > 0) return 60 / i.heart_rate_bpm;
  return NaN;
}

export function calc_qtc(i: QTcInputs): { bazett: number; fridericia: number } {
  const rr = rrFrom(i);
  const qtb = i.qt_ms / Math.sqrt(rr);
  const qtf = i.qt_ms / Math.cbrt(rr);
  return { bazett: qtb, fridericia: qtf };
}

const def = {
  id: "qtc",
  label: "QTc (Bazett & Fridericia)",
  inputs: [
    { id: "qt_ms", label: "QT (ms)", type: "number", min: 100, max: 800 },
    { id: "rr_sec", label: "RR (sec)", type: "number", min: 0.3, max: 2.5 },
    { id: "heart_rate_bpm", label: "Heart rate (bpm)", type: "number", min: 20, max: 220 }
  ],
  run: (args: QTcInputs) => {
    const r = calc_qtc(args);
    const notes = [`Fridericia ${r.fridericia.toFixed(0)} ms`];
    return { id: "qtc", label: "QTc (Bazett)", value: r.bazett, unit: "ms", precision: 0, notes, extra: r };
  },
};

export default def;
