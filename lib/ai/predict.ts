import { Point, windowStats } from "@/lib/ai/features";
import { evaluateCardiovascularRisk } from "@/lib/ai/rulesets/cardiovascular";
import type {
  EngineeredFeatures,
  FeatureBuilderInput,
  MetricWindowStats,
  PredictionResult,
  WindowKey,
  WindowSnapshot,
} from "@/types/prediction";

const WINDOW_SPECS: { key: WindowKey; days: number }[] = [
  { key: "days7", days: 7 },
  { key: "days30", days: 30 },
  { key: "days90", days: 90 },
  { key: "days365", days: 365 },
];

const TRACKED_NORMALS: Partial<Record<string, [number | null, number | null]>> = {
  ldl: [0, 130],
  triglycerides: [0, 175],
  hba1c: [0, 6.4],
  sbp: [90, 129],
  dbp: [60, 79],
  bmi: [18.5, 24.9],
  hr: [55, 100],
  temp: [36.1, 37.5],
  spo2: [95, 100],
};

const RISK_CORE_METRICS = ["ldl", "triglycerides", "hba1c", "sbp", "bmi"];

const TIMESTAMP_KEYS = [
  "taken_at",
  "observed_at",
  "recorded_at",
  "measured_at",
  "measuredAt",
  "collected_at",
  "collectedAt",
  "sampled_at",
  "resulted_at",
  "reported_at",
  "start_at",
  "started_at",
  "startAt",
  "encountered_at",
  "occurred_at",
  "created_at",
  "createdAt",
  "timestamp",
  "time",
  "date",
  "datetime",
  "effective_at",
  "effective_time",
];

const METRIC_ALIASES: Record<string, string> = {
  ldl: "ldl",
  ldl_c: "ldl",
  ldl_cholesterol: "ldl",
  low_density_lipoprotein: "ldl",
  triglyceride: "triglycerides",
  triglycerides: "triglycerides",
  triacylglycerol: "triglycerides",
  tg: "triglycerides",
  hba1c: "hba1c",
  hb_a1c: "hba1c",
  hemoglobin_a1c: "hba1c",
  glycated_hemoglobin: "hba1c",
  glycosylated_hemoglobin: "hba1c",
  glycohemoglobin: "hba1c",
  sbp: "sbp",
  systolic: "sbp",
  systolic_bp: "sbp",
  systolic_blood_pressure: "sbp",
  systolic_pressure: "sbp",
  bp_systolic: "sbp",
  systolic_reading: "sbp",
  dbp: "dbp",
  diastolic: "dbp",
  diastolic_bp: "dbp",
  diastolic_blood_pressure: "dbp",
  bp_diastolic: "dbp",
  bmi: "bmi",
  body_mass_index: "bmi",
  heart_rate: "hr",
  hr: "hr",
  pulse: "hr",
  bpm: "hr",
  temperature: "temp",
  temp: "temp",
  body_temperature: "temp",
  spo2: "spo2",
  oxygen_saturation: "spo2",
  o2_saturation: "spo2",
  weight: "weight",
  weight_kg: "weight",
  body_weight: "weight",
  mass: "weight",
  height: "height",
  body_height: "height",
  stature: "height",
  visits: "visits",
  encounter: "visits",
  encounters: "visits",
  visit: "visits",
};

const TRACKED_METRICS = new Set([
  "ldl",
  "triglycerides",
  "hba1c",
  "sbp",
  "dbp",
  "bmi",
  "hr",
  "temp",
  "spo2",
  "weight",
  "height",
  "visits",
]);

const SNAPSHOT_FIELDS: (keyof MetricWindowStats)[] = [
  "n",
  "count",
  "mean",
  "min",
  "max",
  "std",
  "slope",
  "first",
  "firstObservedAt",
  "last",
  "lastObservedAt",
  "timeSinceLast",
  "percentOutOfRange",
  "timeSinceLastNormal",
];

const asNumber = (value: unknown): number | null => {
  if (value == null) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const match = value.match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : null;
  }
  if (typeof value === "object") {
    const candidate = (value as Record<string, unknown>).value ?? (value as Record<string, unknown>).amount;
    return asNumber(candidate);
  }
  return null;
};

const toTimestamp = (value: unknown): number | null => {
  if (value == null) return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return value > 3_000_000_000 ? value : value * 1000;
  }
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.getTime();
  }
  return null;
};

const extractTimestamp = (...rows: any[]): number | null => {
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    for (const key of TIMESTAMP_KEYS) {
      const ts = toTimestamp((row as Record<string, unknown>)[key]);
      if (ts != null) return ts;
    }
  }
  return null;
};

const normaliseMetric = (raw: unknown): string | null => {
  if (typeof raw !== "string") return null;
  const cleaned = raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (!cleaned) return null;
  if (METRIC_ALIASES[cleaned]) return METRIC_ALIASES[cleaned];
  if (cleaned.includes("ldl")) return "ldl";
  if (cleaned.includes("triglycer")) return "triglycerides";
  if (cleaned.includes("a1c")) return "hba1c";
  if (cleaned.includes("glyc")) return "hba1c";
  if (cleaned.includes("systolic")) return "sbp";
  if (cleaned.includes("diastolic")) return "dbp";
  if (cleaned.includes("bmi")) return "bmi";
  if (cleaned.includes("heart_rate") || cleaned.endsWith("bpm")) return "hr";
  if (cleaned.includes("pulse")) return "hr";
  if (cleaned.includes("temp")) return "temp";
  if (cleaned.includes("oxygen") || cleaned.includes("spo2")) return "spo2";
  if (cleaned.includes("weight")) return "weight";
  if (cleaned.includes("height")) return "height";
  if (cleaned.includes("encounter") || cleaned.includes("visit")) return "visits";
  return TRACKED_METRICS.has(cleaned) ? cleaned : null;
};

const mergeRow = (row: any) => {
  if (!row || typeof row !== "object") return {} as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...row };
  const nestedKeys = ["meta", "details", "data", "payload", "extra"];
  for (const key of nestedKeys) {
    const nested = row?.[key];
    if (nested && typeof nested === "object") {
      Object.assign(merged, nested);
    }
  }
  return merged;
};

const addPoint = (series: Record<string, Point[]>, metric: string, timestamp: number, value: number) => {
  if (!TRACKED_METRICS.has(metric)) return;
  if (!Number.isFinite(value)) return;
  if (!series[metric]) series[metric] = [];
  series[metric].push({ t: timestamp, v: value });
};

const parseBpString = (value: string): { systolic?: number; diastolic?: number } => {
  const match = value.match(/(\d{2,3})\s*[^0-9]+\s*(\d{2,3})/);
  if (!match) return {};
  const systolic = Number(match[1]);
  const diastolic = Number(match[2]);
  return {
    systolic: Number.isFinite(systolic) ? systolic : undefined,
    diastolic: Number.isFinite(diastolic) ? diastolic : undefined,
  };
};

const ensureSortedSeries = (series: Record<string, Point[]>) => {
  for (const key of Object.keys(series)) {
    series[key].sort((a, b) => a.t - b.t);
  }
};

const computeMissingMetrics = (windows: Record<WindowKey, WindowSnapshot>): string[] => {
  const missing: string[] = [];
  for (const metric of RISK_CORE_METRICS) {
    const hasData = WINDOW_SPECS.some(({ key }) => windows[key][metric]);
    if (!hasData) missing.push(metric);
  }
  return missing;
};

export function buildTimeSeriesFeatures(input: FeatureBuilderInput): EngineeredFeatures {
  const vitals = Array.isArray(input.vitals) ? input.vitals : [];
  const labs = Array.isArray(input.labs) ? input.labs : [];
  const encounters = Array.isArray(input.encounters) ? input.encounters : [];

  const series: Record<string, Point[]> = {};
  const eventSeries: Record<string, number[]> = { visits: [] };

  for (const row of vitals) {
    const merged = mergeRow(row);
    const ts = extractTimestamp(row, merged);
    if (ts == null) continue;
    const seen = new Set<string>();

    const directNumericFields: Array<[string, string]> = [
      ["sbp", "sbp"],
      ["systolic", "sbp"],
      ["systolic_bp", "sbp"],
      ["systolic_blood_pressure", "sbp"],
      ["dbp", "dbp"],
      ["diastolic", "dbp"],
      ["diastolic_bp", "dbp"],
      ["diastolic_blood_pressure", "dbp"],
      ["bmi", "bmi"],
      ["body_mass_index", "bmi"],
      ["weight", "weight"],
      ["weight_kg", "weight"],
      ["body_weight", "weight"],
      ["height", "height"],
      ["body_height", "height"],
      ["heart_rate", "hr"],
      ["hr", "hr"],
      ["pulse", "hr"],
      ["temperature", "temp"],
      ["temp", "temp"],
      ["spo2", "spo2"],
      ["oxygen_saturation", "spo2"],
    ];

    for (const [field, metric] of directNumericFields) {
      if (seen.has(metric)) continue;
      const val = asNumber(merged[field]);
      if (val != null) {
        addPoint(series, metric, ts, val);
        seen.add(metric);
      }
    }

    if (typeof merged.bp === "string" && !seen.has("sbp")) {
      const parsed = parseBpString(merged.bp);
      if (parsed.systolic != null) {
        addPoint(series, "sbp", ts, parsed.systolic);
        seen.add("sbp");
      }
      if (parsed.diastolic != null) {
        addPoint(series, "dbp", ts, parsed.diastolic);
        seen.add("dbp");
      }
    }

    const metricName =
      normaliseMetric(merged.metric as string) ??
      normaliseMetric(merged.type as string) ??
      normaliseMetric(merged.kind as string) ??
      normaliseMetric(merged.name as string) ??
      normaliseMetric(merged.label as string);
    if (metricName && !seen.has(metricName)) {
      const value = asNumber(merged.value ?? merged.result ?? merged.reading ?? merged.measurement ?? merged.amount);
      if (value != null) {
        addPoint(series, metricName, ts, value);
        seen.add(metricName);
      }
    }
  }

  for (const row of labs) {
    const merged = mergeRow(row);
    const ts = extractTimestamp(row, merged);
    if (ts == null) continue;
    const metricName =
      normaliseMetric(merged.metric as string) ??
      normaliseMetric(merged.test as string) ??
      normaliseMetric(merged.name as string) ??
      normaliseMetric(merged.code as string) ??
      normaliseMetric(merged.analyte as string) ??
      normaliseMetric(merged.label as string);
    if (!metricName) continue;
    const value = asNumber(merged.value ?? merged.result ?? merged.measurement ?? merged.amount ?? merged.numeric_value);
    if (value == null) continue;
    addPoint(series, metricName, ts, value);
  }

  for (const row of encounters) {
    const merged = mergeRow(row);
    const ts = extractTimestamp(row, merged);
    if (ts == null) continue;
    eventSeries.visits.push(ts);
  }

  if (eventSeries.visits.length) {
    eventSeries.visits.sort((a, b) => a - b);
    series.visits = eventSeries.visits.map((t) => ({ t, v: 1 }));
  }

  ensureSortedSeries(series);

  const windows: Record<WindowKey, WindowSnapshot> = {
    days7: {},
    days30: {},
    days90: {},
    days365: {},
  };

  const flatFeatures: Record<string, MetricWindowStats> = {};

  for (const [metric, points] of Object.entries(series)) {
    for (const spec of WINDOW_SPECS) {
      const normalRange = TRACKED_NORMALS[metric] ?? undefined;
      const stats = windowStats(points, spec.days, normalRange ? { normalRange } : {});
      if (!stats) continue;
      windows[spec.key][metric] = stats;
      flatFeatures[`${metric}_${spec.key}`] = stats;
    }
  }

  const missing = computeMissingMetrics(windows);

  const features: EngineeredFeatures = {
    windows,
    demographics: input.demographics,
    counts: {},
  } as EngineeredFeatures;

  Object.assign(features, flatFeatures);

  const counts: Record<string, number> = {};
  for (const spec of WINDOW_SPECS) {
    const visitStats = windows[spec.key].visits;
    if (visitStats) {
      counts[`visits_${spec.key}`] = visitStats.count ?? visitStats.n;
    }
  }
  if (Object.keys(counts).length) {
    features.counts = counts;
  } else {
    delete features.counts;
  }

  if (missing.length) {
    features.missing = missing;
  }

  return features;
}

const labelForScore = (score: number): PredictionResult["riskLabel"] => {
  if (score < 0.33) return "Low";
  if (score < 0.66) return "Moderate";
  return "High";
};

const buildWindowsSnapshot = (windows: Record<WindowKey, WindowSnapshot>) => {
  const snapshot: Record<WindowKey, WindowSnapshot> = {
    days7: {},
    days30: {},
    days90: {},
    days365: {},
  };

  for (const [winKey, metrics] of Object.entries(windows) as [WindowKey, WindowSnapshot][]) {
    const metricEntries = Object.entries(metrics).map(([metric, stat]) => {
      const filtered: Partial<MetricWindowStats> = {};
      for (const field of SNAPSHOT_FIELDS) {
        const value = stat[field];
        if (value != null) {
          filtered[field] = value;
        }
      }
      return [metric, filtered] as [string, MetricWindowStats];
    });
    snapshot[winKey] = Object.fromEntries(metricEntries);
  }

  return snapshot;
};

export async function scoreRisk(features: EngineeredFeatures): Promise<PredictionResult> {
  const evaluation = evaluateCardiovascularRisk(features);
  const normalised = evaluation.maxScore > 0 ? Math.min(1, Math.max(0, evaluation.score / evaluation.maxScore)) : 0;
  const riskLabel = labelForScore(normalised);

  const metricSet = new Set<string>();
  for (const win of Object.values(features.windows)) {
    for (const metric of Object.keys(win)) {
      metricSet.add(metric);
    }
  }

  const context = {
    featureCount: metricSet.size,
    missing: features.missing,
    demographicSummary: buildDemographicSummary(features.demographics),
  };

  const result: PredictionResult = {
    condition: "Cardiovascular",
    riskScore: normalised,
    riskLabel,
    topFactors: evaluation.factors,
    windows: buildWindowsSnapshot(features.windows),
    generatedAt: new Date().toISOString(),
    context,
  };

  return result;
}

const buildDemographicSummary = (demographics: EngineeredFeatures["demographics"]): string | undefined => {
  if (!demographics) return undefined;
  const parts: string[] = [];
  if (demographics.sex) parts.push(String(demographics.sex));
  if (typeof demographics.age === "number" && Number.isFinite(demographics.age)) {
    parts.push(`${Math.round(demographics.age)} yrs`);
  }
  return parts.length ? parts.join(", ") : undefined;
};
