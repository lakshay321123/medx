
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchLabSummary } from "@/lib/labs/summary";
import { lipidsRules } from "@/lib/aidoc/rules/lipids";
import { diabetesRules } from "@/lib/aidoc/rules/diabetes";
import { thyroidRules } from "@/lib/aidoc/rules/thyroid";
import { htnRules } from "@/lib/aidoc/rules/htn";
import { redflagChecks } from "@/lib/aidoc/rules/redflags";

export type Status = "high" | "low" | "ok" | "normal" | "unknown";
export type Trend = "improving" | "worsening" | "flat" | "unknown" | "insufficient_data";

type Highlight = { name: string; value: number | string | null; unit: string | null; status: Status };
type ReportCard = { date: string; highlights: Highlight[]; mini_summary: string };

type DomainRow = { domain: string; status: Status; trend: Trend };

type MetricSeriesPoint = { date: string; value: number | null; unit: string | null; status: Status };

export type SnapshotPayload = {
  type: "patient_snapshot";
  meta: {
    last_updated: string;
    patient: { name: string | null; age: number | null; sex: string | null };
  };
  summary_tagline: string;
  reports: ReportCard[];
  domains: DomainRow[];
  ai_prediction: { concise: string; confidence: "low" | "medium" | "high" };
  next_steps: string[];
  safety: string[];
  provenance: { sources: string[]; assumptions: string[] };
};

export type MetricComparePayload = {
  type: "metric_compare";
  metric: string;
  series: MetricSeriesPoint[];
  trend: Trend;
  interpretation: string;
  actions: string[];
};

type MetricConfig = {
  label: string;
  codes: string[];
  polarity: "lower" | "higher" | "neutral";
  expectedUnit?: string;
  low?: number;
  high?: number;
};

const METRIC_CONFIG: Record<string, MetricConfig> = {
  LDL: { label: "LDL", codes: ["LDL-C"], polarity: "lower", expectedUnit: "mg/dl", high: 130 },
  HDL: { label: "HDL", codes: ["HDL-C"], polarity: "higher", expectedUnit: "mg/dl", low: 40 },
  "Total Cholesterol": {
    label: "Total Cholesterol",
    codes: ["TC"],
    polarity: "lower",
    expectedUnit: "mg/dl",
    high: 200,
  },
  Triglycerides: {
    label: "Triglycerides",
    codes: ["TG"],
    polarity: "lower",
    expectedUnit: "mg/dl",
    high: 150,
  },
  HbA1c: { label: "HbA1c", codes: ["HBA1C"], polarity: "lower", expectedUnit: "%", high: 6.5 },
  "Fasting Glucose": {
    label: "Fasting Glucose",
    codes: ["FBG"],
    polarity: "lower",
    expectedUnit: "mg/dl",
    high: 126,
    low: 70,
  },
  "ALT (SGPT)": {
    label: "ALT (SGPT)",
    codes: ["ALT (SGPT)", "ALT"],
    polarity: "lower",
    expectedUnit: "u/l",
    high: 45,
  },
  "AST (SGOT)": {
    label: "AST (SGOT)",
    codes: ["AST (SGOT)", "AST"],
    polarity: "lower",
    expectedUnit: "u/l",
    high: 45,
  },
  ALP: {
    label: "ALP",
    codes: ["ALP"],
    polarity: "neutral",
    expectedUnit: "u/l",
    high: 120,
    low: 40,
  },
};

const CODE_TO_CANON = new Map<string, string>();
for (const [canon, cfg] of Object.entries(METRIC_CONFIG)) {
  for (const code of cfg.codes) {
    CODE_TO_CANON.set(code.toUpperCase(), canon);
  }
}

function canonicalMetric(code: string, fallback: string): string {
  const canon = CODE_TO_CANON.get(code.toUpperCase());
  if (canon) return canon;
  return fallback;
}

function canonicalMetricName(name: string): string {
  const trimmed = name.trim();
  if (METRIC_CONFIG[trimmed]) return trimmed;
  const upper = trimmed.toUpperCase();
  const canon = CODE_TO_CANON.get(upper);
  if (canon) return canon;
  return trimmed;
}

function polarityFor(name: string): "lower" | "higher" | "neutral" {
  if (/hdl/i.test(name)) return "higher";
  if (/ldl|tc|triglyceride|tg|alt|ast|alp|crp|esr/i.test(name)) return "lower";
  return "neutral";
}

function statusFor(
  value: number | null,
  lo: number | null,
  hi: number | null,
  polarity: "lower" | "higher" | "neutral",
): Status {
  if (value == null || Number.isNaN(value)) {
    return "unknown";
  }

  const hasBounds = lo != null || hi != null;
  if (!hasBounds) {
    return "unknown";
  }

  if (lo != null && value < lo) {
    return "low";
  }

  if (hi != null && value > hi) {
    return "high";
  }

  if (polarity === "higher") {
    return "ok";
  }

  return "normal";
}

function summarizeHighlights(card: ReportCard): string {
  const find = (name: string) => card.highlights.find((h) => canonicalMetricName(h.name) === name);
  const notices: string[] = [];
  const ldl = find("LDL");
  const tc = find("Total Cholesterol");
  const glucose = find("Fasting Glucose");
  const a1c = find("HbA1c");
  const alt = find("ALT (SGPT)");
  const ast = find("AST (SGOT)");

  if ((ldl && ldl.status === "high") || (tc && tc.status === "high")) {
    notices.push("Cholesterol elevated");
  }

  if ((alt && alt.status === "high") || (ast && ast.status === "high")) {
    notices.push("Liver enzymes high");
  }

  if (glucose && (glucose.status === "normal" || glucose.status === "ok")) {
    notices.push("Glucose within goal");
  }

  if (a1c && a1c.status === "high") {
    notices.push("HbA1c elevated");
  }

  if (notices.length === 0) {
    notices.push("No strong signals");
  }

  const line = notices.join("; ");
  return line.charAt(0).toUpperCase() + line.slice(1) + ".";
}

function inferConfidence(reportCount: number, uniqueDays: number): "low" | "medium" | "high" {
  if (reportCount >= 3 && uniqueDays >= 3) return "high";
  if (reportCount >= 2) return "medium";
  return "low";
}

function dedupe<T>(input: T[]): T[] {
  return Array.from(new Set(input.filter(Boolean)));
}

function trendFromSeries(series: MetricSeriesPoint[]): Trend {
  if (!Array.isArray(series) || series.length < 2) {
    return series.length === 0 ? "insufficient_data" : "insufficient_data";
  }

  const sorted = series
    .filter((p) => p.value != null && Number.isFinite(p.value))
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length < 2) {
    return "insufficient_data";
  }

  const first = sorted[0].value as number;
  const last = sorted[sorted.length - 1].value as number;
  if (!Number.isFinite(first) || !Number.isFinite(last)) {
    return "unknown";
  }

  if (last < first * 0.97) {
    return "improving";
  }
  if (last > first * 1.03) {
    return "worsening";
  }
  return "flat";
}

function buildPredictionLine(domains: DomainRow[], safety: string[]): string {
  const hot: string[] = [];
  for (const d of domains) {
    if (d.status !== "high") continue;
    if (d.domain === "cholesterol") {
      hot.push("dyslipidemia likely");
    } else if (d.domain === "liver_enzymes") {
      hot.push("liver enzymes elevated—repeat & review causes");
    } else if (d.domain === "glucose_control") {
      hot.push("possible glucose dysregulation");
    }
  }

  const base = hot.length ? hot.join("; ") : "No strong signals yet";
  return safety.length ? `${base}. Safety alerts present.` : `${base}.`;
}

type SnapshotContext = {
  reports: ReportCard[];
  metricSeries: Record<string, MetricSeriesPoint[]>;
};

async function collectSnapshotContext(
  client: SupabaseClient,
  userId: string,
): Promise<{ context: SnapshotContext; totalReports: number } | null> {
  const summary = await fetchLabSummary(client, { userId, limit: 5000 });
  if (!summary || !Array.isArray(summary.trend)) {
    return null;
  }

  type RawHighlight = {
    canon: string;
    name: string;
    value: number | string | null;
    unit: string | null;
    status: Status;
    ts: number;
    sourceKey: string;
    date: string;
  };

  const rawByDate = new Map<string, RawHighlight[]>();
  const metricBuckets: Record<string, Map<string, { date: string; value: number | null; unit: string | null; status: Status; ts: number }>> = {};

  for (const entry of summary.trend) {
    const canon = canonicalMetric(entry.test_code, entry.test_name);
    const config = METRIC_CONFIG[canon];
    const label = config ? config.label : canon;
    const series = Array.isArray(entry.series) ? entry.series : [];

    for (const sample of series) {
      const iso = typeof sample.sample_date === "string" ? sample.sample_date : null;
      if (!iso) continue;
      const date = iso.slice(0, 10);
      if (!date) continue;

      const tsRaw = new Date(iso).getTime();
      const ts = Number.isFinite(tsRaw) ? tsRaw : Date.parse(`${date}T00:00:00Z`);
      const docId =
        (sample as any).document_id ??
        (sample as any).doc_id ??
        (sample as any).report_id ??
        (entry as any).document_id ??
        (entry as any).report_id ??
        (entry as any).thread_id ??
        "x";
      const testKey = entry.test_code ?? entry.test_name ?? label;
      const sourceKey = `${docId}:${testKey}`;

      const rawValue =
        typeof sample.value === "number"
          ? sample.value
          : typeof (sample as any).value_num === "number"
          ? (sample as any).value_num
          : (sample as any).value ?? null;
      const unit = sample.unit ?? entry.unit ?? null;
      const refLow =
        (sample as any).ref_low ??
        (sample as any).refLow ??
        (sample as any).reference_low ??
        (sample as any).referenceLow ??
        (entry as any).ref_low ??
        (entry as any).refLow ??
        null;
      const refHigh =
        (sample as any).ref_high ??
        (sample as any).refHigh ??
        (sample as any).reference_high ??
        (sample as any).referenceHigh ??
        (entry as any).ref_high ??
        (entry as any).refHigh ??
        null;

      const status = statusFor(
        typeof rawValue === "number" ? rawValue : null,
        typeof refLow === "number" ? refLow : null,
        typeof refHigh === "number" ? refHigh : null,
        polarityFor(canon),
      );

      const highlight: RawHighlight = {
        canon,
        name: label,
        value: rawValue ?? null,
        unit: unit ? unit : null,
        status,
        ts: Number.isFinite(ts) ? (ts as number) : 0,
        sourceKey,
        date,
      };

      const bucket = rawByDate.get(date) ?? [];
      bucket.push(highlight);
      rawByDate.set(date, bucket);

      const metricBucket = (metricBuckets[canon] ??= new Map());
      const metricKey = `${sourceKey}:${date}`;
      const prevMetric = metricBucket.get(metricKey);
      if (!prevMetric || highlight.ts >= prevMetric.ts) {
        metricBucket.set(metricKey, {
          date,
          value: typeof rawValue === "number" ? rawValue : null,
          unit: unit ? unit : null,
          status,
          ts: highlight.ts,
        });
      }
    }
  }

  const reports: ReportCard[] = [];
  const dates = Array.from(rawByDate.keys()).sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));
  for (const date of dates) {
    const rows = rawByDate.get(date)!;
    const bySource = new Map<string, RawHighlight>();
    const byCanon = new Map<string, { highlight: Highlight; ts: number }>();

    for (const row of rows) {
      const prev = bySource.get(row.sourceKey);
      if (!prev || row.ts >= prev.ts) {
        bySource.set(row.sourceKey, row);
      }
    }

    for (const row of bySource.values()) {
      const existing = byCanon.get(row.canon);
      if (!existing || row.ts >= existing.ts) {
        byCanon.set(row.canon, {
          highlight: { name: row.name, value: row.value, unit: row.unit, status: row.status },
          ts: row.ts,
        });
      }
    }

    const highlights = Array.from(byCanon.values())
      .map(({ highlight }) => highlight)
      .sort((a, b) => a.name.localeCompare(b.name));

    const card: ReportCard = {
      date,
      highlights,
      mini_summary: "",
    };
    card.mini_summary = summarizeHighlights(card);
    reports.push(card);
  }

  const metricSeries: Record<string, MetricSeriesPoint[]> = {};
  for (const [canon, bucket] of Object.entries(metricBuckets)) {
    const points = Array.from(bucket.values())
      .sort((a, b) => a.ts - b.ts)
      .map(({ ts, ...rest }) => rest);
    if (points.length) {
      metricSeries[canon] = points;
    }
  }

  const totalReports = typeof summary.meta?.total_reports === "number" ? summary.meta.total_reports : reports.length;
  return { context: { reports, metricSeries }, totalReports };
}

function buildDomains(metricSeries: Record<string, MetricSeriesPoint[]>): DomainRow[] {
  const cholesterolStatus = (() => {
    const ldl = metricSeries["LDL"]?.slice(-1)[0];
    const tc = metricSeries["Total Cholesterol"]?.slice(-1)[0];
    if ((ldl && ldl.status === "high") || (tc && tc.status === "high")) {
      return "high" as Status;
    }
    if (ldl) {
      return ldl.status;
    }
    if (tc) {
      return tc.status;
    }
    return "unknown" as Status;
  })();

  const liverStatus = (() => {
    const alt = metricSeries["ALT (SGPT)"]?.slice(-1)[0];
    const ast = metricSeries["AST (SGOT)"]?.slice(-1)[0];
    if ((alt && alt.status === "high") || (ast && ast.status === "high")) {
      return "high" as Status;
    }
    if (alt) return alt.status;
    if (ast) return ast.status;
    return "unknown" as Status;
  })();

  const glucoseStatus = (() => {
    const a1c = metricSeries["HbA1c"]?.slice(-1)[0];
    const fbg = metricSeries["Fasting Glucose"]?.slice(-1)[0];
    if (a1c && a1c.status === "high") {
      return "high" as Status;
    }
    if (fbg) {
      return fbg.status;
    }
    if (a1c) {
      return a1c.status;
    }
    return "unknown" as Status;
  })();

  return [
    { domain: "cholesterol", status: cholesterolStatus, trend: trendFromSeries(metricSeries["LDL"] ?? []) },
    { domain: "liver_enzymes", status: liverStatus, trend: trendFromSeries(metricSeries["ALT (SGPT)"] ?? []) },
    { domain: "glucose_control", status: glucoseStatus, trend: trendFromSeries(metricSeries["HbA1c"] ?? []) },
  ];
}

function labsForRules(metricSeries: Record<string, MetricSeriesPoint[]>): Array<{ name: string; value: number; takenAt: string }> {
  const labs: Array<{ name: string; value: number; takenAt: string }> = [];
  for (const [name, series] of Object.entries(metricSeries)) {
    for (const sample of series) {
      if (sample.value == null || Number.isNaN(sample.value)) continue;
      labs.push({ name, value: sample.value, takenAt: sample.date });
    }
  }
  labs.sort((a, b) => b.takenAt.localeCompare(a.takenAt));
  return labs;
}

export async function buildPatientSnapshot(
  client: SupabaseClient,
  userId: string,
): Promise<SnapshotPayload> {
  const collected = await collectSnapshotContext(client, userId);
  if (!collected) {
    return {
      type: "patient_snapshot",
      meta: { last_updated: new Date().toISOString().slice(0, 10), patient: { name: null, age: null, sex: null } },
      summary_tagline: "No lab values found yet.",
      reports: [],
      domains: [],
      ai_prediction: { concise: "No lab data yet.", confidence: "low" },
      next_steps: ["Upload your lab reports to get started."],
      safety: [],
      provenance: { sources: [], assumptions: ["no_lab_data"] },
    };
  }

  const { context, totalReports } = collected;
  const { reports, metricSeries } = context;

  if (reports.length === 0) {
    return {
      type: "patient_snapshot",
      meta: { last_updated: new Date().toISOString().slice(0, 10), patient: { name: null, age: null, sex: null } },
      summary_tagline: "No lab values found yet.",
      reports: [],
      domains: [],
      ai_prediction: { concise: "No lab data yet.", confidence: "low" },
      next_steps: ["Upload your lab reports to get started."],
      safety: [],
      provenance: { sources: [], assumptions: ["no_lab_data"] },
    };
  }

  const domains = buildDomains(metricSeries);
  const labs = labsForRules(metricSeries);
  const contextForRules = { labs, meds: [], mem: { prefs: [] } } as any;

  type RuleEvalResult = Partial<{
    steps: string[];
    nudges: string[];
    softAlerts: string[];
  }>;

  const packs = [lipidsRules, diabetesRules, thyroidRules, htnRules];
  const steps: string[] = [];
  const nudges: string[] = [];
  const alerts: string[] = [];

  for (const rule of packs) {
    try {
      const result = (rule(contextForRules) || {}) as RuleEvalResult;
      if (Array.isArray(result.steps)) steps.push(...result.steps);
      if (Array.isArray(result.nudges)) nudges.push(...result.nudges);
      if (Array.isArray(result.softAlerts)) alerts.push(...result.softAlerts);
    } catch {
      // ignore rule errors; keep deterministic path
    }
  }

  const summaryTagline = reports[0]?.mini_summary || "No strong signals.";
  const redflagAlerts = redflagChecks({}) ?? [];
  const combinedAlerts = dedupe([...alerts, ...redflagAlerts]);
  const aiPrediction = buildPredictionLine(domains, combinedAlerts);
  const uniqueDates = new Set(reports.map((r) => r.date));

  return {
    type: "patient_snapshot",
    meta: {
      last_updated: new Date().toISOString().slice(0, 10),
      patient: { name: null, age: null, sex: null },
    },
    summary_tagline: summaryTagline,
    reports,
    domains,
    ai_prediction: {
      concise: aiPrediction,
      confidence: inferConfidence(labs.length, uniqueDates.size),
    },
    next_steps: dedupe([...nudges, ...steps]).slice(0, 6),
    safety: combinedAlerts.slice(0, 6),
    provenance: {
      sources: reports.map((r) => `lab_reports:${r.date}`),
      assumptions: totalReports > 1 ? [] : ["single_timepoint"],
    },
  };
}

export async function buildMetricCompare(
  client: SupabaseClient,
  userId: string,
  metric: string,
): Promise<MetricComparePayload> {
  const collected = await collectSnapshotContext(client, userId);
  const empty: MetricComparePayload = {
    type: "metric_compare",
    metric,
    series: [],
    trend: "insufficient_data",
    interpretation: `${metric} not found in your reports yet.`,
    actions: [`Upload a report that includes ${metric}.`],
  };

  if (!collected) {
    return empty;
  }

  const series = collected.context.metricSeries[metric] ?? [];
  if (!series.length) {
    return empty;
  }

  const trend = trendFromSeries(series);
  const interpretation =
    series.length === 1
      ? `${metric} available for one date; need another result to spot a trend.`
      : `${metric} trend is ${trend}.`;

  const actions = series.length
    ? [`Repeat ${metric} if advised by your clinician, especially if values stay abnormal.`]
    : [`Upload a report that includes ${metric}.`];

  return {
    type: "metric_compare",
    metric,
    series,
    trend,
    interpretation,
    actions,
  };
}
