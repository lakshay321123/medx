export type TrendPoint = { date: string; value: number; unit?: string | null };

export type TrendStats = {
  min: TrendPoint;
  max: TrendPoint;
  latest: TrendPoint;
  previous: TrendPoint | null;
  direction: "rising" | "falling" | "stable";
  delta: number;
};

function normalizePoint(point: TrendPoint): TrendPoint {
  return {
    date: point.date,
    value: Number(point.value),
    unit: point.unit ?? null,
  };
}

export function computeTrendStats(points: TrendPoint[]): TrendStats | null {
  if (!Array.isArray(points)) return null;
  const normalized = points
    .filter((p) => p && typeof p.value === "number" && !Number.isNaN(Number(p.value)))
    .map((p) => normalizePoint(p))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (normalized.length === 0) return null;
  const min = normalized.reduce((acc, cur) => (cur.value < acc.value ? cur : acc), normalized[0]);
  const max = normalized.reduce((acc, cur) => (cur.value > acc.value ? cur : acc), normalized[0]);
  const latest = normalized[normalized.length - 1];
  const previous = normalized.length > 1 ? normalized[normalized.length - 2] : null;
  const delta = previous ? Number(latest.value) - Number(previous.value) : 0;
  let direction: TrendStats["direction"] = "stable";
  if (previous) {
    if (Math.abs(delta) < 1e-6) {
      direction = "stable";
    } else {
      direction = delta > 0 ? "rising" : "falling";
    }
  }
  return { min, max, latest, previous, direction, delta };
}

export function describeTrend(metric: string, stats: TrendStats | null): string | null {
  if (!stats) return null;
  const unit = stats.latest.unit ? ` ${stats.latest.unit}` : "";
  const latestStr = `${stats.latest.value}${unit} (${stats.latest.date})`;
  const prevStr = stats.previous
    ? `${stats.previous.value}${unit} (${stats.previous.date})`
    : "no previous reading";
  const trendLabel =
    stats.direction === "rising"
      ? "rising"
      : stats.direction === "falling"
      ? "falling"
      : "stable";
  const deltaStr = stats.previous
    ? `Δ ${stats.delta > 0 ? "+" : ""}${stats.delta}${unit}`
    : "";
  return `${metric}: ${prevStr} → ${latestStr}; ${trendLabel}${deltaStr ? ` (${deltaStr})` : ""}`.trim();
}
