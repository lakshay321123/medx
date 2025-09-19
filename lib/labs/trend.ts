import { supabaseAdmin } from "@/lib/supabase/admin";

export type CanonicalDirection = "lower" | "higher" | null;

export type CanonicalLab = {
  code: string;
  name: string;
  better: CanonicalDirection;
  kinds: string[];
};

const CANONICAL_LABS: CanonicalLab[] = [
  {
    code: "LDL-C",
    name: "LDL Cholesterol",
    better: "lower",
    kinds: ["ldl", "ldl_cholesterol", "ldl cholesterol", "ldl-c"],
  },
  {
    code: "HDL-C",
    name: "HDL Cholesterol",
    better: "higher",
    kinds: ["hdl", "hdl_cholesterol", "hdl cholesterol", "hdl-c"],
  },
  {
    code: "TG",
    name: "Triglycerides",
    better: "lower",
    kinds: ["triglycerides", "tg"],
  },
  {
    code: "TC",
    name: "Total Cholesterol",
    better: "lower",
    kinds: ["total_cholesterol", "cholesterol", "cholesterol_total", "total cholesterol"],
  },
  {
    code: "HBA1C",
    name: "HbA1c",
    better: "lower",
    kinds: ["hba1c", "a1c"],
  },
  {
    code: "CRP",
    name: "C-reactive protein",
    better: "lower",
    kinds: ["crp", "c_reactive_protein", "c-reactive protein"],
  },
  {
    code: "ESR",
    name: "ESR",
    better: "lower",
    kinds: ["esr"],
  },
  {
    code: "VITD",
    name: "Vitamin D (25-OH)",
    better: "higher",
    kinds: ["vitamin_d", "vitamin_d_25_oh", "vitd", "25_oh_vitamin_d", "vitamin d"],
  },
  {
    code: "UIBC",
    name: "UIBC",
    better: null,
    kinds: ["uibc", "unsaturated_iron_binding_capacity"],
  },
  {
    code: "ALT",
    name: "ALT (SGPT)",
    better: "lower",
    kinds: ["sgpt", "alt", "alt (sgpt)"],
  },
  {
    code: "AST",
    name: "AST (SGOT)",
    better: "lower",
    kinds: ["sgot", "ast", "ast (sgot)"],
  },
];

const KIND_TO_CANONICAL = new Map<string, CanonicalLab>();
for (const lab of CANONICAL_LABS) {
  for (const raw of lab.kinds) {
    KIND_TO_CANONICAL.set(raw.toLowerCase(), lab);
  }
}

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
};

export async function fetchLabsTrend({ userId, client, limit = 1000 }: FetchParams): Promise<TrendItem[]> {
  const supa = client ?? supabaseAdmin();
  const kinds = Array.from(KIND_TO_CANONICAL.keys());
  const { data, error } = await supa
    .from("observations")
    .select("kind,value_num,unit,observed_at,created_at")
    .eq("user_id", userId)
    .in("kind", kinds)
    .order("observed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return buildTrendFromRows(data ?? []);
}

export function buildTrendFromRows(rows: ObservationRow[]): TrendItem[] {
  const grouped = new Map<string, TrendItem>();

  for (const row of rows) {
    const canonical = canonicalForKind(row.kind);
    if (!canonical) continue;

    const point: TrendPoint = {
      value: parseNumeric(row.value_num),
      unit: row.unit ?? null,
      sample_date: toIsoTimestamp(row.observed_at || row.created_at),
    };

    const bucket = grouped.get(canonical.code);
    if (!bucket) {
      grouped.set(canonical.code, {
        test_code: canonical.code,
        test_name: canonical.name,
        unit: row.unit ?? null,
        better: canonical.better,
        latest: null,
        previous: null,
        direction: "unknown",
        series: [point],
      });
    } else {
      if (!bucket.unit && row.unit) bucket.unit = row.unit;
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

function canonicalForKind(kind?: string | null): CanonicalLab | undefined {
  if (!kind) return undefined;
  return KIND_TO_CANONICAL.get(kind.toLowerCase());
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
