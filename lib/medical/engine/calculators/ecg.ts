import { register } from "../registry";

const rr = (hr: number) => 60 / hr;

register({
  id: "qtc_fridericia",
  label: "QTc (Fridericia)",
  inputs: [
    { key: "QTms", required: true, unit: "ms" },
    { key: "HR", required: true },
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
    { key: "HR", required: true },
  ],
  run: ({ QTms, HR }) => {
    if (QTms == null || HR == null) return null;
    const val = QTms / Math.sqrt(rr(HR));
    return { id: "qtc_bazett", label: "QTc (Bazett)", value: val, unit: "ms", precision: 0 };
  },
});
