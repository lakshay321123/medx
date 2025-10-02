
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

function normalizeUnit(unit: string | null | undefined): string | null {
  if (!unit) return null;
  return unit.trim().toLowerCase();
}

function computeStatus(metric: string, value: number | null | undefined, unit: string | null | undefined): Status {
  if (value == null || Number.isNaN(value)) {
    return "unknown";
  }

  const config = METRIC_CONFIG[metric];
  if (!config) {
    return "unknown";
  }

  const normUnit = normalizeUnit(unit);
  if (config.expectedUnit && normUnit && normUnit !== config.expectedUnit) {
    return "unknown";
  }

  if (config.high != null && value > config.high) {
    return "high";
  }

  if (config.low != null && value < config.low) {
    return "low";
  }

  if (config.polarity === "higher") {
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
  const critical: string[] = [];
  for (const item of domains) {
    if (item.status === "high") {
      if (item.domain === "cholesterol") {
        critical.push("dyslipidemia risk");
      } else if (item.domain === "liver_enzymes") {
        critical.push("possible hepatic stress");
      } else if (item.domain === "glucose_control") {
        critical.push("glycemic risk");
      }
    }
  }

  const base = critical.length ? critical.join("; ") : "No strong signals yet";
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

  const perDate = new Map<string, Map<string, Highlight>>();
  const metricSeries: Record<string, MetricSeriesPoint[]> = {};

  for (const entry of summary.trend) {
    const canon = canonicalMetric(entry.test_code, entry.test_name);
    const config = METRIC_CONFIG[canon];

    for (const sample of entry.series || []) {
      const date = typeof sample.sample_date === "string" ? sample.sample_date.slice(0, 10) : null;
      if (!date) {
        continue;
      }

      const unit = sample.unit ?? entry.unit ?? null;
      const value = typeof sample.value === "number" ? sample.value : null;
      const status = computeStatus(canon, value, unit);

      if (!metricSeries[canon]) {
        metricSeries[canon] = [];
      }
      metricSeries[canon].push({ date, value, unit: unit ? unit : null, status });

      if (!perDate.has(date)) {
        perDate.set(date, new Map());
      }

      const highlights = perDate.get(date)!;
      const label = config ? config.label : canon;
      if (!highlights.has(label)) {
        highlights.set(label, { name: label, value, unit: unit ? unit : null, status });
      }
    }
  }

  const reports: ReportCard[] = Array.from(perDate.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, highlightMap]) => {
      const highlights = Array.from(highlightMap.values()).sort((a, b) => a.name.localeCompare(b.name));
      const card: ReportCard = {
        date,
        highlights,
        mini_summary: "",
      };
      card.mini_summary = summarizeHighlights(card);
      return card;
    });

  for (const series of Object.values(metricSeries)) {
    series.sort((a, b) => a.date.localeCompare(b.date));
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

  const packs = [lipidsRules, diabetesRules, thyroidRules, htnRules];
  const steps: string[] = [];
  const nudges: string[] = [];
  const alerts: string[] = [];

  for (const rule of packs) {
    try {
      const result = rule(contextForRules) || {};
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
