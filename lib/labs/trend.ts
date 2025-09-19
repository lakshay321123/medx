import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  CANONICAL_LABS,
  canonicalForCode,
  canonicalForKind,
  type CanonicalDirection,
  type CanonicalLab,
} from "@/lib/labs/codes";

export type ObservationRow = {
  kind: string | null;
  value_num: number | string | null;
  unit: string | null;
  observed_at: string | null;
  created_at: string | null;
};

export type TrendPoint = {
  value: number | null;
  unit: string | null;
  sample_date: string | null;
};

export type TrendDirection = "improving" | "worsening" | "flat" | "unknown";

export type TrendItem = {
  test_code: string;
  test_name: string;
  unit: string | null;
  better: CanonicalDirection;
  latest: TrendPoint | null;
  previous: TrendPoint | null;
  direction: TrendDirection;
  series: TrendPoint[];
};

export type LabsSnapshot = {
  trend: TrendItem[];
  latest: Record<string, TrendPoint | null>;
  previous: Record<string, TrendPoint | null>;
  direction: Record<string, TrendDirection>;
  recency_days: Record<string, number | null>;
  counts: Record<string, number>;
};

type SupabaseClient = ReturnType<typeof supabaseAdmin>;

type FetchParams = {
  userId: string;
  client?: SupabaseClient;
  limit?: number;
  tests?: string[];
  from?: string;
  to?: string;
};

export async function fetchLabsTrend({
  userId,
  client,
  limit = 1000,
  tests,
  from,
  to,
}: FetchParams): Promise<TrendItem[]> {
  const supa = client ?? supabaseAdmin();
  const targetLabs = Array.isArray(tests) && tests.length
    ? tests
        .map(code => canonicalForCode(code))
        .filter((lab): lab is CanonicalLab => !!lab)
    : CANONICAL_LABS;
  if (!targetLabs.length) return [];

  const kinds = Array.from(
    new Set(
      targetLabs
        .map(lab => lab.kinds)
        .flat()
        .map(kind => kind.toLowerCase()),
    ),
  );
  if (!kinds.length) return [];

  const { data, error } = await supa
    .from("observations")
    .select("kind,value_num,unit,observed_at,created_at")
    .eq("user_id", userId)
    .in("kind", kinds)
    .order("observed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  const rows = (data ?? []).filter(row => {
    const sample = ts(toIsoTimestamp(row.observed_at || row.created_at));
    if (!Number.isFinite(sample)) return false;
    if (from) {
      const fromTs = Date.parse(from);
      if (Number.isFinite(fromTs) && sample < fromTs) return false;
    }
    if (to) {
      const toTs = Date.parse(to);
      if (Number.isFinite(toTs) && sample > toTs) return false;
    }
    return true;
  });
  return buildTrendFromRows(rows, targetLabs.map(l => l.code));
}

export function buildTrendFromRows(rows: ObservationRow[], allowedCodes?: string[]): TrendItem[] {
  const grouped = new Map<string, TrendItem>();

  for (const row of rows) {
    const canonical = canonicalForKind(row.kind);
    if (!canonical) continue;
    if (allowedCodes && allowedCodes.length && !allowedCodes.includes(canonical.code)) continue;

    const point = buildPoint(row, canonical);
    if (!point) continue;

    const bucket = grouped.get(canonical.code);
    if (!bucket) {
      grouped.set(canonical.code, {
        test_code: canonical.code,
        test_name: canonical.name,
        unit: point.unit,
        better: canonical.better,
        latest: null,
        previous: null,
        direction: "unknown",
        series: [point],
      });
    } else {
      if (!bucket.unit && point.unit) bucket.unit = point.unit;
      bucket.series.push(point);
    }
  }

  const trend = Array.from(grouped.values()).map(item => {
    const sorted = [...item.series].sort((a, b) => ts(b.sample_date) - ts(a.sample_date));
    const latest = sorted[0] ?? null;
    const previous = sorted[1] ?? null;
    let direction: TrendDirection = "unknown";

    if (latest?.value != null && previous?.value != null) {
      const diff = latest.value - previous.value;
      if (Math.abs(diff) < 1e-9) {
        direction = "flat";
      } else if (item.better === "lower") {
        direction = diff < 0 ? "improving" : "worsening";
      } else if (item.better === "higher") {
        direction = diff > 0 ? "improving" : "worsening";
      }
    }

    return {
      ...item,
      unit: latest?.unit ?? item.unit ?? null,
      latest,
      previous,
      direction,
      series: sorted,
    };
  });

  trend.sort((a, b) => ts(b.latest?.sample_date ?? null) - ts(a.latest?.sample_date ?? null));
  return trend;
}

export function buildLabsSnapshot(trend: TrendItem[]): LabsSnapshot {
  const latest: Record<string, TrendPoint | null> = {};
  const previous: Record<string, TrendPoint | null> = {};
  const direction: Record<string, TrendDirection> = {};
  const recency_days: Record<string, number | null> = {};
  const counts: Record<string, number> = {};

  const now = Date.now();
  for (const item of trend) {
    latest[item.test_code] = item.latest ?? null;
    previous[item.test_code] = item.previous ?? null;
    direction[item.test_code] = item.direction;
    counts[item.test_code] = item.series.length;

    const sample = item.latest?.sample_date ? Date.parse(item.latest.sample_date) : NaN;
    if (Number.isFinite(sample)) {
      const diffDays = (now - sample) / (1000 * 60 * 60 * 24);
      recency_days[item.test_code] = diffDays >= 0 ? Math.round(diffDays) : null;
    } else {
      recency_days[item.test_code] = null;
    }
  }

  return { trend, latest, previous, direction, recency_days, counts };
}

function parseNumeric(value: number | string | null | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim()) {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

function toIsoTimestamp(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function ts(value: string | null): number {
  if (!value) return -Infinity;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : -Infinity;
}

function buildPoint(row: ObservationRow, canonical: CanonicalLab): TrendPoint | null {
  const value = parseNumeric(row.value_num);
  const sample_date = toIsoTimestamp(row.observed_at || row.created_at);
  if (value == null || !sample_date) return null;

  const normalized = normalizeValue({ value, unit: row.unit, lab: canonical });
  if (!normalized) return null;

  return {
    value: normalized.value,
    unit: normalized.unit,
    sample_date,
  };
}

function normalizeValue({
  value,
  unit,
  lab,
}: {
  value: number;
  unit: string | null;
  lab: CanonicalLab;
}): { value: number; unit: string | null } | null {
  const rawUnit = typeof unit === "string" ? unit.trim() : "";
  const normUnit = rawUnit.toLowerCase();

  const mgdl = "mg/dL";

  const isMmol = (u: string) => /mmol\s*\/\s*l/.test(u);
  const isMg = (u: string) => /mg\s*\/\s*dl/.test(u);

  switch (lab.code) {
    case "LDL-C":
    case "HDL-C":
    case "TC": {
      if (isMmol(normUnit)) {
        return { value: round(value * 38.67, 1), unit: mgdl };
      }
      if (!rawUnit || isMg(normUnit)) {
        return { value: round(value, 1), unit: mgdl };
      }
      return null;
    }
    case "TG": {
      if (isMmol(normUnit)) {
        return { value: round(value * 88.57, 1), unit: mgdl };
      }
      if (!rawUnit || isMg(normUnit)) {
        return { value: round(value, 1), unit: mgdl };
      }
      return null;
    }
    case "HBA1C": {
      if (!rawUnit || normUnit === "%" || normUnit === "percent") {
        return { value: round(value, 1), unit: "%" };
      }
      return null;
    }
    default:
      return {
        value: round(value, 2),
        unit: rawUnit || null,
      };
  }
}

function round(value: number, precision = 2): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}
