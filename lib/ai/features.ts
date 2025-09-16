import type { MetricWindowStats, WindowKey, WindowSnapshot, WindowStatOptions } from "@/types/prediction";

export type Point = { t: number; v: number };
export const DAY = 86_400_000;

const NOW = () => Date.now();

export function windowStats(points: Point[], days: number, options: WindowStatOptions = {}): MetricWindowStats | null {
  if (!Array.isArray(points) || points.length === 0) return null;
  const cutoff = NOW() - days * DAY;
  const windowPoints = points.filter((p) => typeof p?.t === "number" && p.t >= cutoff).sort((a, b) => a.t - b.t);
  if (!windowPoints.length) return null;

  const values = windowPoints.map((p) => p.v).filter((v) => Number.isFinite(v));
  if (!values.length) return null;

  const n = values.length;
  const mean = values.reduce((acc, val) => acc + val, 0) / n;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const variance = values.reduce((acc, val) => acc + (val - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);

  const firstPoint = windowPoints[0];
  const lastPoint = windowPoints[windowPoints.length - 1];
  const denomDays = Math.max(1, (lastPoint.t - firstPoint.t) / DAY);
  const slope = windowPoints.length > 1 ? (lastPoint.v - firstPoint.v) / denomDays : 0;
  const timeSinceLast = Math.max(0, (NOW() - lastPoint.t) / DAY);

  let percentOutOfRange: number | undefined;
  let timeSinceLastNormal: number | undefined;

  if (options.normalRange) {
    const [low, high] = options.normalRange;
    let normalCount = 0;
    let lastNormalTs: number | null = null;
    for (const point of windowPoints) {
      const isAboveLow = low == null || point.v >= low;
      const isBelowHigh = high == null || point.v <= high;
      if (isAboveLow && isBelowHigh) {
        normalCount += 1;
        lastNormalTs = point.t;
      }
    }
    percentOutOfRange = ((n - normalCount) / n) * 100;
    if (lastNormalTs != null) {
      timeSinceLastNormal = Math.max(0, (NOW() - lastNormalTs) / DAY);
    }
  }

  return {
    n,
    count: n,
    mean,
    min,
    max,
    std,
    slope,
    first: firstPoint.v,
    last: lastPoint.v,
    firstObservedAt: new Date(firstPoint.t).toISOString(),
    lastObservedAt: new Date(lastPoint.t).toISOString(),
    timeSinceLast,
    percentOutOfRange,
    timeSinceLastNormal,
  };
}

export function cloneWindowSnapshots(source: Record<WindowKey, WindowSnapshot>): Record<WindowKey, WindowSnapshot> {
  const entries = Object.entries(source).map(([winKey, metrics]) => [
    winKey,
    Object.fromEntries(
      Object.entries(metrics).map(([metric, stat]) => [
        metric,
        { ...stat },
      ])
    ),
  ]);
  return Object.fromEntries(entries) as Record<WindowKey, WindowSnapshot>;
}
