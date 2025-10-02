import type { LabSeriesPoint, LabTrend } from "../labs/summary";
import { getTestDefinitions } from "../labs/summary";

type DerivedStatus = "critical" | "high" | "low" | "normal" | "unknown";
type SummaryStatus = DerivedStatus | "mixed";

type SnapshotTest = {
  code: string;
  canonicalKey: string;
  name: string;
  shortName: string;
  value: number;
  unit: string;
  status: DerivedStatus;
  severity: number;
  timestamp: number;
  documentId: string | null;
};

type SnapshotBucket = {
  key: string;
  timestamp: number;
  displayDate: string;
  tests: Map<string, SnapshotTest>;
  docTests: Map<string, SnapshotTest>;
};

type MetricInfo = {
  code: string;
  label: string;
};

type MetricPattern = {
  regex: RegExp;
  metric: MetricInfo;
};

export type LabSnapshotIntent =
  | { kind: "snapshot" }
  | { kind: "compare"; metric: MetricInfo };

const FEATURE_FLAG =
  process.env.AIDOC_FORCE_INTERCEPT === undefined || process.env.AIDOC_FORCE_INTERCEPT === "1";
const HARD_FLAG = process.env.AIDOC_FORCE_INTERCEPT_HARD === "1";

const SNAPSHOT_PATTERNS: RegExp[] = [
  /\bpull (?:all )?my reports?\b/i,
  /\bshow (?:all )?my reports?\b/i,
  /\bfetch (?:all )?my reports?\b/i,
  /\blist(?:\s+out)? (?:all )?my reports?\b/i,
  /\bwhat do my reports say\b/i,
  /\bcompare my reports?\b/i,
  /\blab (?:history|trend)\b/i,
  /\breport (?:history|trend)\b/i,
  /\bdate\s*wise\b/i,
  /\bdatewise\b/i,
  /\bhow(?:'s|\s+is) my health overall\b/i,
  /\bhow(?:'s|\s+is) my overall health\b/i,
];

const EXTRA_ALIAS: Record<string, string[]> = {
  "LDL-C": ["ldl-c", "ldl cholesterol", "bad cholesterol"],
  "HDL-C": ["hdl-c", "hdl cholesterol", "good cholesterol"],
  TG: ["triglyceride", "triglycerides"],
  TC: ["total cholesterol", "cholesterol total", "cholesterol"],
  HBA1C: ["a1c", "glycated hemoglobin", "glycosylated hemoglobin"],
  FBG: ["fasting blood glucose", "fasting glucose", "fbg", "glucose fasting"],
  "ALT (SGPT)": ["alt", "sgpt", "alanine aminotransferase"],
  "AST (SGOT)": ["ast", "sgot", "aspartate aminotransferase"],
  GGT: ["gamma gt", "gamma glutamyl transferase", "ggt"],
  ALP: ["alkaline phosphatase"],
  CREAT: ["serum creatinine", "creatinine"],
  EGFR: ["estimated gfr", "gfr", "egfr"],
  UREA: ["blood urea nitrogen", "bun", "urea"],
  CRP: ["c reactive protein", "c-reactive protein"],
  ESR: ["erythrocyte sedimentation rate", "sed rate", "esr"],
  FERRITIN: ["serum ferritin", "ferritin"],
  VITD: ["vitamin d", "vit d", "25 oh vitamin d", "25-oh vitamin d", "vitd"],
  UIBC: ["unsaturated iron binding capacity", "uibc"],
  TIBC: ["total iron binding capacity", "tibc"],
};

const SUFFIX_PATTERN = "(?:\\s+(?:levels?|level|results?|result|values?|value|numbers?|number|trend|trends|history|changes?|change|over\\s+time|over-time|reading|readings?))*";

const METRIC_PATTERNS: MetricPattern[] = buildMetricPatterns();

const SHORT_NAME_MAP: Record<string, string> = {
  "LDL-C": "LDL",
  "HDL-C": "HDL",
  TG: "Triglycerides",
  TC: "Total Cholesterol",
  HBA1C: "HbA1c",
  FBG: "Fasting Glucose",
  "ALT (SGPT)": "ALT",
  "AST (SGOT)": "AST",
  GGT: "GGT",
  ALP: "ALP",
  CREAT: "Creatinine",
  EGFR: "eGFR",
  UREA: "Urea",
  CRP: "CRP",
  ESR: "ESR",
  FERRITIN: "Ferritin",
  VITD: "Vitamin D",
  UIBC: "UIBC",
  TIBC: "TIBC",
};

const CANONICAL_CODE_MAP: Record<string, string> = Object.fromEntries(
  getTestDefinitions().map((def) => [def.test_code, canonicalize(def.test_name)]),
);

const GROUP_LABEL_BY_CODE: Record<string, string> = {
  "LDL-C": "Cholesterol",
  "HDL-C": "Cholesterol",
  TG: "Cholesterol",
  TC: "Cholesterol",
  HBA1C: "Glucose",
  FBG: "Glucose",
  "ALT (SGPT)": "Liver enzymes",
  "AST (SGOT)": "Liver enzymes",
  GGT: "Liver enzymes",
  ALP: "Liver enzymes",
  CREAT: "Kidney function",
  EGFR: "Kidney function",
  UREA: "Kidney function",
  CRP: "Inflammation",
  ESR: "Inflammation",
  FERRITIN: "Iron stores",
  UIBC: "Iron stores",
  TIBC: "Iron stores",
  VITD: "Vitamins",
};

const NEXT_STEPS = [
  "Discuss abnormal or outdated results with your clinician before making changes.",
  "Upload new lab reports when you receive them so this view stays current.",
  "Keep up balanced meals, movement, and sleep unless your clinician advises otherwise.",
];

const MAX_DATES = 5;
const MAX_CHIPS = 6;
const MAX_SUMMARY_SEGMENTS = 3;

export function isLabSnapshotEnabled(): boolean {
  return FEATURE_FLAG;
}

export function isLabSnapshotHardMode(): boolean {
  return HARD_FLAG;
}

export function detectLabSnapshotIntent(message: string): LabSnapshotIntent | null {
  if (!FEATURE_FLAG) return null;
  if (!message) return null;
  const text = message.trim();
  if (!text) return null;
  const lower = text.toLowerCase();

  for (const re of SNAPSHOT_PATTERNS) {
    if (re.test(lower)) {
      return { kind: "snapshot" };
    }
  }

  for (const entry of METRIC_PATTERNS) {
    if (entry.regex.test(lower)) {
      return { kind: "compare", metric: entry.metric };
    }
  }

  return null;
}

export function formatLabIntentResponse(
  trendInput: LabTrend[] | undefined,
  intent: LabSnapshotIntent,
  opts: { emptyMessage?: string } = {},
): string {
  const trend = Array.isArray(trendInput) ? trendInput : [];
  return intent.kind === "snapshot"
    ? buildSnapshotResponse(trend, opts)
    : buildComparisonResponse(trend, intent.metric, opts);
}

function buildSnapshotResponse(trend: LabTrend[], opts: { emptyMessage?: string }): string {
  const buckets = buildBuckets(trend).slice(0, MAX_DATES);
  const lines: string[] = ["## Patient Snapshot", ""];

  if (buckets.length === 0) {
    if (opts.emptyMessage) {
      lines.push(opts.emptyMessage);
    } else {
      lines.push("No structured lab results found yet. Add recent reports or ask your clinician to share them.");
    }
  } else {
    for (const bucket of buckets) {
      const tests = Array.from(bucket.tests.values());
      if (tests.length === 0) continue;
      const summary = buildMiniSummary(tests);
      lines.push(`${bucket.displayDate} — ${summary}`);
      const chips = buildChipsLine(tests);
      if (chips) lines.push(chips);
      lines.push("");
    }
  }

  trimTrailingBlanks(lines);
  appendNextSteps(lines);
  return lines.join("\n");
}

function buildComparisonResponse(trend: LabTrend[], metric: MetricInfo, opts: { emptyMessage?: string }): string {
  const headerLabel = metricHeader(metric);
  const lines: string[] = [`## Compare ${headerLabel}`, ""];
  const entry = trend.find((t) => t.test_code === metric.code || canonicalize(t.test_name) === canonicalize(metric.label));

  const series = entry?.series ? dedupeSeriesByDate(entry.series) : [];
  const points = series.map((p) => ({
    value: p.value,
    unit: formatUnit(p.unit || entry?.unit || ""),
    status: deriveStatus(p),
    sample_date: p.sample_date,
  }));

  if (points.length === 0) {
    if (opts.emptyMessage) {
      lines.push(opts.emptyMessage);
    } else {
      lines.push(`No ${metric.label} results found yet. Add recent reports or ask your clinician to share them.`);
      lines.push("", "Need ≥2 results to comment on a trend.");
    }
  } else {
    for (const point of points) {
      const dateLabel = formatDateLabel(point.sample_date);
      const valueLabel = formatNumber(point.value);
      const unitPart = point.unit ? ` ${point.unit}` : "";
      lines.push(`${dateLabel}: ${valueLabel}${unitPart} (${statusWord(point.status)})`);
    }
    if (points.length < 2) {
      lines.push("", "Need ≥2 results to comment on a trend.");
    }
  }

  trimTrailingBlanks(lines);
  appendNextSteps(lines);
  return lines.join("\n");
}

function buildBuckets(trend: LabTrend[]): SnapshotBucket[] {
  const buckets = new Map<string, SnapshotBucket>();

  for (const series of trend) {
    const code = series.test_code;
    const name = series.test_name;
    const shortName = SHORT_NAME_MAP[code] ?? series.test_name;
    const canonicalCode = canonicalKeyForTest(code, name);

    for (const point of series.series || []) {
      if (!Number.isFinite(point.value)) continue;
      if (!point.sample_date) continue;
      const date = new Date(point.sample_date);
      if (Number.isNaN(date.getTime())) continue;
      const dateKey = point.sample_date.slice(0, 10);
      const baseTs = Date.parse(`${dateKey}T00:00:00Z`);
      const timestamp = Number.isFinite(baseTs) ? baseTs : date.getTime();
      const displayDate = formatDateLabel(point.sample_date);
      let bucket = buckets.get(dateKey);
      if (!bucket) {
        bucket = {
          key: dateKey,
          timestamp,
          displayDate,
          tests: new Map<string, SnapshotTest>(),
          docTests: new Map<string, SnapshotTest>(),
        };
        buckets.set(dateKey, bucket);
      }
      const status = deriveStatus(point);
      const severity = statusPriority(status);
      const unit = formatUnit(point.unit || "");
      const documentId = point.document_id ?? point.report_id ?? null;
      const sampleTs = Date.parse(point.sample_date);
      const test: SnapshotTest = {
        code,
        canonicalKey: canonicalCode,
        name,
        shortName,
        value: point.value,
        unit,
        status,
        severity,
        timestamp: Number.isFinite(sampleTs) ? sampleTs : date.getTime(),
        documentId,
      };
      let accepted = true;
      if (documentId) {
        const docKey = `${documentId}::${canonicalCode}`;
        const existingDoc = bucket.docTests.get(docKey);
        if (
          existingDoc &&
          (existingDoc.timestamp > test.timestamp ||
            (existingDoc.timestamp === test.timestamp && existingDoc.severity >= test.severity))
        ) {
          accepted = false;
        } else {
          bucket.docTests.set(docKey, test);
        }
      }

      if (!accepted) {
        continue;
      }

      const existing = bucket.tests.get(canonicalCode);
      if (
        !existing ||
        existing.timestamp < test.timestamp ||
        (existing.timestamp === test.timestamp && existing.severity < test.severity)
      ) {
        bucket.tests.set(canonicalCode, test);
      }
    }
  }

  return Array.from(buckets.values()).sort((a, b) => b.timestamp - a.timestamp);
}

function buildMiniSummary(tests: SnapshotTest[]): string {
  const segments: string[] = [];
  const groupStatuses = new Map<string, DerivedStatus[]>();

  for (const test of tests) {
    const group = GROUP_LABEL_BY_CODE[test.code];
    if (group) {
      const arr = groupStatuses.get(group) ?? [];
      arr.push(test.status);
      groupStatuses.set(group, arr);
    }
  }

  const groupSummaries: { label: string; status: SummaryStatus }[] = [];
  for (const [label, statuses] of groupStatuses.entries()) {
    const summaryStatus = summarizeStatuses(statuses);
    if (summaryStatus !== "unknown") {
      groupSummaries.push({ label, status: summaryStatus });
    }
  }

  groupSummaries.sort((a, b) => {
    const diff = statusPriority(b.status) - statusPriority(a.status);
    return diff !== 0 ? diff : a.label.localeCompare(b.label);
  });

  for (const summary of groupSummaries) {
    segments.push(`${summary.label} ${statusWord(summary.status)}`);
  }

  const individual = tests
    .filter((t) => !GROUP_LABEL_BY_CODE[t.code] && t.status !== "unknown")
    .sort((a, b) => {
      const diff = b.severity - a.severity;
      return diff !== 0 ? diff : a.shortName.localeCompare(b.shortName);
    });

  for (const test of individual) {
    segments.push(`${test.shortName} ${statusWord(test.status)}`);
  }

  if (segments.length === 0) {
    return "Values listed below (status unknown).";
  }

  return segments.slice(0, MAX_SUMMARY_SEGMENTS).join("; ") + ".";
}

function buildChipsLine(tests: SnapshotTest[]): string {
  const sorted = tests
    .slice()
    .sort((a, b) => {
      const diff = b.severity - a.severity;
      return diff !== 0 ? diff : a.shortName.localeCompare(b.shortName);
    });

  const chips = sorted.map((test) => {
    const value = formatNumber(test.value);
    const unit = test.unit ? ` ${test.unit}` : "";
    return `${test.shortName}: ${value}${unit} (${statusWord(test.status)})`;
  });

  if (chips.length === 0) return "";
  const visible = chips.slice(0, MAX_CHIPS);
  const remaining = chips.length - visible.length;
  if (remaining > 0) visible.push(`+${remaining} more`);
  return visible.join(" • ");
}

function deriveStatus(point: LabSeriesPoint): DerivedStatus {
  const fromStatus = normalizeStatusString(point.status);
  if (fromStatus) return fromStatus;

  const fromFlag = normalizeStatusString(point.flag);
  if (fromFlag) return fromFlag;

  const value = Number(point.value);
  if (!Number.isFinite(value)) return "unknown";
  const low = Number.isFinite(point.ref_low ?? NaN) ? Number(point.ref_low) : null;
  const high = Number.isFinite(point.ref_high ?? NaN) ? Number(point.ref_high) : null;

  if (low != null && value < low) return "low";
  if (high != null && value > high) return "high";
  if (low != null || high != null) {
    const aboveLow = low == null || value >= low;
    const belowHigh = high == null || value <= high;
    if (aboveLow && belowHigh) return "normal";
  }
  return "unknown";
}

function normalizeStatusString(raw: unknown): DerivedStatus | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim().toLowerCase();
  if (!value) return null;
  if (/crit|panic/.test(value)) return "critical";
  if (/(very\s+high|high|elev|above|raised)/.test(value)) return "high";
  if (/(very\s+low|low|below|reduced|defici)/.test(value)) return "low";
  if (/(normal|within|ok|fine|stable|adequate)/.test(value)) return "normal";
  if (value === "h") return "high";
  if (value === "l") return "low";
  if (value === "n") return "normal";
  if (value === "c") return "critical";
  return null;
}

function summarizeStatuses(statuses: DerivedStatus[]): SummaryStatus {
  const meaningful = statuses.filter((s) => s !== "unknown");
  if (meaningful.length === 0) return "unknown";
  if (meaningful.includes("critical")) return "critical";
  const hasHigh = meaningful.includes("high");
  const hasLow = meaningful.includes("low");
  if (hasHigh && hasLow) return "mixed";
  if (hasHigh) return "high";
  if (hasLow) return "low";
  if (meaningful.includes("normal")) return "normal";
  return "unknown";
}

function statusPriority(status: SummaryStatus): number {
  switch (status) {
    case "critical":
      return 5;
    case "high":
      return 4;
    case "low":
      return 3;
    case "mixed":
      return 2;
    case "normal":
      return 2;
    default:
      return 0;
  }
}

function statusWord(status: SummaryStatus): string {
  return status;
}

function formatDateLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  const abs = Math.abs(value);
  const format = (digits: number) => value.toFixed(digits).replace(/\.0+$/, "").replace(/\.([0-9]*?)0+$/, ".$1").replace(/\.$/, "");
  if (abs >= 1000) return format(0);
  if (abs >= 100) return format(1);
  if (abs >= 10) return format(1);
  return format(2);
}

function formatUnit(unit: string): string {
  const trimmed = unit.trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  if (lower === "mg/dl") return "mg/dL";
  if (lower === "mmol/l") return "mmol/L";
  if (lower === "%") return "%";
  if (lower === "u/l") return "U/L";
  if (lower === "ng/ml") return "ng/mL";
  if (lower === "pg/ml") return "pg/mL";
  if (lower === "µiu/ml" || lower === "uiu/ml") return "µIU/mL";
  return trimmed;
}

function appendNextSteps(lines: string[]) {
  lines.push("", "### What to do next");
  for (const step of NEXT_STEPS) {
    lines.push(`- ${step}`);
  }
}

function trimTrailingBlanks(lines: string[]) {
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }
}

function canonicalize(input: string | null | undefined): string {
  return (input || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function canonicalKeyForTest(code: string, name: string): string {
  return CANONICAL_CODE_MAP[code] ?? canonicalize(name || code);
}

function metricHeader(metric: MetricInfo): string {
  return SHORT_NAME_MAP[metric.code] ?? metric.label;
}

function dedupeSeriesByDate(series: LabSeriesPoint[]): LabSeriesPoint[] {
  const filtered = series.filter(
    (p): p is LabSeriesPoint =>
      !!p && Number.isFinite(p.value) && typeof p.sample_date === "string" && !!p.sample_date,
  );

  const sorted = filtered.slice().sort((a, b) => {
    const aTime = Date.parse(a.sample_date);
    const bTime = Date.parse(b.sample_date);
    if (!Number.isFinite(aTime) || !Number.isFinite(bTime)) {
      return a.sample_date.localeCompare(b.sample_date);
    }
    return bTime - aTime;
  });

  const docSeen = new Set<string>();
  const dateMap = new Map<string, LabSeriesPoint>();

  for (const point of sorted) {
    const dateKey = point.sample_date.slice(0, 10);
    const docId = point.document_id ?? point.report_id ?? null;
    if (docId) {
      const docKey = `${docId}::${dateKey}`;
      if (docSeen.has(docKey)) {
        continue;
      }
      docSeen.add(docKey);
    }
    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, point);
    }
  }

  return Array.from(dateMap.values()).sort((a, b) => {
    const aTime = Date.parse(a.sample_date);
    const bTime = Date.parse(b.sample_date);
    if (!Number.isFinite(aTime) || !Number.isFinite(bTime)) {
      return a.sample_date.localeCompare(b.sample_date);
    }
    return aTime - bTime;
  });
}

function buildMetricPatterns(): MetricPattern[] {
  const defs = getTestDefinitions();
  const patterns: MetricPattern[] = [];
  const seen = new Set<string>();

  for (const def of defs) {
    const aliases = new Set<string>();
    aliases.add(def.test_code);
    aliases.add(def.test_name);
    for (const kind of def.kinds) {
      aliases.add(kind.replace(/_/g, " "));
    }
    for (const extra of EXTRA_ALIAS[def.test_code] ?? []) {
      aliases.add(extra);
    }

    for (const alias of aliases) {
      for (const variant of expandAlias(alias)) {
        const pattern = aliasToPattern(variant);
        if (!pattern) continue;
        const source = `compare:${def.test_code}:${pattern}`;
        if (seen.has(source)) continue;
        seen.add(source);
        const regex = new RegExp(
          `\\bcompare\\b(?:\\s+all)?(?:\\s+of)?(?:\\s+my)?\\s+${pattern}${SUFFIX_PATTERN}(?=\\s|[?.!,]|$)`,
          "i",
        );
        patterns.push({ regex, metric: { code: def.test_code, label: def.test_name } });
      }
    }
  }

  return patterns;
}

function expandAlias(alias: string): string[] {
  const base = alias.trim().toLowerCase();
  if (!base) return [];
  const variants = new Set<string>();
  variants.add(base);
  variants.add(base.replace(/_/g, " "));
  variants.add(base.replace(/-/g, " "));
  variants.add(base.replace(/\s+/g, " "));
  return Array.from(variants).filter(Boolean);
}

function aliasToPattern(alias: string): string {
  const words = alias.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  return words.map((word) => escapeRegExp(word)).join("\\s+");
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
