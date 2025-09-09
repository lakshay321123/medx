import { register } from "../registry";

// QTc (Bazett): QTc = QT / sqrt(RR) ; RR in seconds
register({
  id: "qtc_bazett",
  label: "QTc (Bazett)",
  inputs: [
    { key: "QT", required: true },  // ms
    { key: "RR", required: true },  // s
  ],
  run: ({ QT, RR }) => {
    if (!RR || RR <= 0) return null;
    const qtc = (QT! / 1000) / Math.sqrt(RR!) * 1000; // back to ms
    const notes: string[] = [];
    if (qtc > 500) notes.push("markedly prolonged");
    return { id: "qtc_bazett", label: "QTc (Bazett)", value: qtc, unit: "ms", precision: 0, notes };
  },
});

