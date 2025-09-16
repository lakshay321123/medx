import { register } from "../registry";

const rr = (hr: number) => 60 / hr;

register({
  id: "qtc_fridericia",
  label: "QTc (Fridericia)",
  inputs: [
    { key: "QTms", required: true, unit: "ms" },
    { key: "HR", unit: "bpm", required: true },
  ],
  run: ({ QTms, HR }) => {
    if (QTms == null || HR == null) return null;
    const val = QTms / Math.cbrt(rr(HR));
    return { id: "qtc_fridericia", label: "QTc (Fridericia)", value: val, unit: "ms", precision: 0 };
  },
});

register({
  id: "qtc_bazett",
  label: "QTc (Bazett)",
  inputs: [
    { key: "QTms", required: true, unit: "ms" },
    { key: "HR", unit: "bpm", required: true },
  ],
  run: ({ QTms, HR }) => {
    if (QTms == null || HR == null) return null;
    const val = QTms / Math.sqrt(rr(HR));
    const notes: string[] = [];
    if (val > 500) notes.push("markedly prolonged");
    return { id: "qtc_bazett", label: "QTc (Bazett)", value: val, unit: "ms", precision: 0, notes };
  },
});
