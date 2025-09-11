export type QTcInputs = { qt_ms: number; hr_bpm: number };

export function calc_qtc_bazett(i: QTcInputs): number {
  const rr_s = 60 / Math.max(1, i.hr_bpm);
  return i.qt_ms / Math.sqrt(rr_s);
}

const def = {
  id: "qtc_bazett",
  label: "QTc (Bazett)",
  inputs: [
    { id: "qt_ms", label: "QT (ms)", type: "number", min: 0 },
    { id: "hr_bpm", label: "Heart rate (bpm)", type: "number", min: 1 }
  ],
  run: (args: QTcInputs) => {
    const v = calc_qtc_bazett(args);
    return { id: "qtc_bazett", label: "QTc (Bazett)", value: v, unit: "ms", precision: 0, notes: [] };
  },
};

export default def;
