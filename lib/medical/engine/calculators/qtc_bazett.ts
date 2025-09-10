import { register } from "../registry";

/**
 * QTc (Bazett) = QT / sqrt(RR). RR from HR if provided.
 */
export function calc_qtc_bazett({
  qt_ms, rr_s, heart_rate_bpm
}: {
  qt_ms: number,
  rr_s?: number,
  heart_rate_bpm?: number
}) {
  const RR = rr_s ?? (heart_rate_bpm ? 60 / heart_rate_bpm : undefined);
  if (RR == null || RR <= 0) return { qtc_ms: NaN, rr_s: RR };
  const qtc_ms = qt_ms / Math.sqrt(RR);
  return { qtc_ms, rr_s: RR };
}

register({
  id: "qtc_bazett",
  label: "QTc (Bazett)",
  tags: ["cardiology"],
  inputs: [
    { key: "qt_ms", required: true },
    { key: "rr_s" },
    { key: "heart_rate_bpm" }
  ],
  run: ({ qt_ms, rr_s, heart_rate_bpm }: { qt_ms: number; rr_s?: number; heart_rate_bpm?: number; }) => {
    const r = calc_qtc_bazett({ qt_ms, rr_s, heart_rate_bpm });
    return { id: "qtc_bazett", label: "QTc (Bazett)", value: r.qtc_ms, unit: "ms", precision: 0, notes: [], extra: r };
  },
});
