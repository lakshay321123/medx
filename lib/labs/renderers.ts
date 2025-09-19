import type { LabTestSeries, LabSeriesPoint, LabsSummaryMeta } from "@/lib/fetchLabsSummary";

const ORDER = [
  "hba1c",
  "fasting_glucose",
  "ldl",
  "hdl",
  "triglycerides",
  "total_cholesterol",
  "non_hdl",
  "egfr",
  "creatinine",
  "alt",
  "ast",
  "alp",
  "crp",
  "vitamin_d",
];

type BadgeStatus = "high" | "low" | "borderline" | null;

const BADGE_ICON: Record<Exclude<BadgeStatus, null>, string> = {
  high: "↑",
  low: "↓",
  borderline: "•",
};

const LABELS: Record<string, string> = {
  hba1c: "HbA1c",
  fasting_glucose: "Fasting Glucose",
  ldl: "LDL",
  hdl: "HDL",
  triglycerides: "TG",
  total_cholesterol: "Total Chol",
  non_hdl: "Non-HDL",
  egfr: "eGFR",
  creatinine: "Creatinine",
  urea: "Urea",
  alt: "ALT",
  ast: "AST",
  alp: "ALP",
  crp: "CRP",
  vitamin_d: "Vitamin D",
};

type ValueClassifier = {
  high?: number;
  low?: number;
  borderlineHigh?: number;
  borderlineLow?: number;
  goodHigh?: boolean;
};

const CLASSIFIERS: Record<string, ValueClassifier> = {
  hba1c: { high: 6.5, borderlineHigh: 5.7, low: 4 },
  fasting_glucose: { high: 126, borderlineHigh: 100, low: 70 },
  ldl: { high: 160, borderlineHigh: 130, low: 40 },
  hdl: { low: 40, high: 60, goodHigh: true },
  triglycerides: { high: 200, borderlineHigh: 150, low: 40 },
  total_cholesterol: { high: 240, borderlineHigh: 200, low: 90 },
  non_hdl: { high: 160, borderlineHigh: 130, low: 80 },
  egfr: { low: 60, borderlineLow: 90 },
  creatinine: { high: 1.3, low: 0.6 },
  urea: { high: 45, borderlineHigh: 40, low: 10 },
  alt: { high: 35, low: 5 },
  ast: { high: 35, low: 5 },
  alp: { high: 147, low: 44 },
  crp: { high: 20, borderlineHigh: 10, low: 0 },
  vitamin_d: { high: 100, borderlineLow: 30, low: 20 },
};

function toDayKey(date: string): string {
  return date.slice(0, 10);
}

function parseDate(date: string): Date | null {
  const d = new Date(date);
  if (!Number.isNaN(d.getTime())) return d;
  const fallback = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function distinctDays(trend: LabTestSeries[]): string[] {
  const set = new Set<string>();
  for (const test of trend) {
    for (const point of test.series || []) {
      if (point?.sample_date) set.add(toDayKey(point.sample_date));
    }
  }
  return Array.from(set).sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));
}

export function seriesByCode(trend: LabTestSeries[]): Map<string, LabTestSeries> {
  const map = new Map<string, LabTestSeries>();
  for (const t of trend) {
    if (!t?.test_code) continue;
    map.set(t.test_code.toLowerCase(), t);
  }
  return map;
}

function computeNonHdl(
  total: LabTestSeries | undefined,
  hdl: LabTestSeries | undefined,
): LabTestSeries | null {
  if (!total || !hdl) return null;
  const series: LabSeriesPoint[] = [];
  for (const tPoint of total.series || []) {
    const day = toDayKey(tPoint.sample_date);
    const hdlPoint = (hdl.series || []).find(p => toDayKey(p.sample_date) === day);
    if (hdlPoint && typeof tPoint.value === "number" && typeof hdlPoint.value === "number") {
      const value = Number((tPoint.value - hdlPoint.value).toFixed(1));
      series.push({ sample_date: tPoint.sample_date, value });
    }
  }
  return { test_code: "non_hdl", test_name: "Non-HDL", unit: total.unit, series };
}

function getSeriesIncludingDerived(trend: LabTestSeries[]): Map<string, LabTestSeries> {
  const base = seriesByCode(trend);
  const total = base.get("total_cholesterol");
  const hdl = base.get("hdl");
  const nonHdl = computeNonHdl(total, hdl);
  if (nonHdl) {
    base.set("non_hdl", nonHdl);
  }
  return base;
}

function valueOnDate(series: LabTestSeries | undefined, day: string): number | null {
  if (!series) return null;
  const match = (series.series || []).find(p => toDayKey(p.sample_date) === day);
  return typeof match?.value === "number" ? match.value : null;
}

function formatDate(day: string | undefined): string {
  if (!day) return "—";
  const d = parseDate(day);
  return d ? d.toLocaleDateString() : day;
}

function classifyValue(code: string, value: number | null): BadgeStatus {
  if (value == null) return null;
  const cfg = CLASSIFIERS[code];
  if (!cfg) return null;

  if (cfg.goodHigh) {
    if (cfg.high != null && value >= cfg.high) return "high";
    if (cfg.low != null && value < cfg.low) return "low";
    return null;
  }

  if (cfg.high != null && value >= cfg.high) return "high";
  if (cfg.borderlineHigh != null && value >= cfg.borderlineHigh) return "borderline";
  if (cfg.low != null && value < cfg.low) return "low";
  if (cfg.borderlineLow != null && value < cfg.borderlineLow) return "borderline";
  return null;
}

function formatValue(value: number | null): string {
  if (value == null) return "—";
  const rounded = Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(1);
  return `${parseFloat(rounded)}`;
}

function formatValueWithUnit(value: number | null, unit?: string): string {
  if (value == null) return "—";
  const formatted = formatValue(value);
  return unit ? `${formatted} ${unit}` : formatted;
}

function badgeFor(code: string, value: number | null): string {
  const status = classifyValue(code, value);
  return status ? BADGE_ICON[status] : "";
}

function changeDirection(
  code: string,
  a: number | null,
  b: number | null,
): "rising" | "falling" | "stable" {
  if (a == null || b == null) return "stable";
  const delta = b - a;
  const pct = a === 0 ? (delta === 0 ? 0 : Infinity) : (delta / Math.abs(a)) * 100;
  const statusChange = classifyValue(code, a) !== classifyValue(code, b);
  if (!statusChange && (pct === Infinity || Math.abs(pct) < 5)) return "stable";
  if (delta > 0) return "rising";
  if (delta < 0) return "falling";
  return "stable";
}

export function renderDatewise(trend: LabTestSeries[], meta?: LabsSummaryMeta): string {
  const days = distinctDays(trend);
  const map = getSeriesIncludingDerived(trend);
  const lines: string[] = [];
  for (const day of days) {
    const parts: string[] = [];
    for (const code of ORDER) {
      const label = LABELS[code] || code;
      const series = map.get(code);
      let value = valueOnDate(series, day);
      if (code === "non_hdl" && value == null) {
        continue;
      }
      if (value != null) {
        const unit = series?.unit;
        parts.push(`${label}: ${formatValueWithUnit(value, unit)}`);
      }
    }
    if (parts.length) {
      lines.push(`- **${formatDate(day)}**: ${parts.join(" • ")}`);
    }
  }

  const totalReports = typeof meta?.total_reports === "number" ? meta.total_reports : lines.length;
  let body = `**Report Timeline**\n\nHere are your reports, sorted by date:\n\n`;
  body += lines.join("\n");
  body += `\n\n**Total reports:** ${lines.length}`;
  if (totalReports > lines.length) body += `\n*Some reports had no structured labs.*`;
  return body;
}

function renderLatestGroup(
  groupName: string,
  codes: string[],
  map: Map<string, LabTestSeries>,
  latestDay: string,
): string[] {
  const rows: string[] = [];
  let hasData = false;
  for (const code of codes) {
    const label = LABELS[code] || code;
    const series = map.get(code);
    const value = valueOnDate(series, latestDay);
    const badge = badgeFor(code, value);
    const unit = series?.unit;
    const formatted = formatValueWithUnit(value, unit);
    if (value != null) hasData = true;
    rows.push(`- ${label}: ${formatted}${badge ? ` ${badge}` : ""}`);
  }
  return hasData ? [`**${groupName}**`, ...rows] : [];
}

export function renderLatest(trend: LabTestSeries[], meta?: LabsSummaryMeta): string {
  const days = distinctDays(trend);
  const latestDay = days[0];
  const map = getSeriesIncludingDerived(trend);
  const groups = [
    { name: "Metabolic", codes: ["hba1c", "fasting_glucose"] },
    { name: "Lipids", codes: ["ldl", "hdl", "triglycerides", "total_cholesterol", "non_hdl"] },
    { name: "Liver", codes: ["alt", "ast", "alp"] },
    { name: "Renal", codes: ["egfr", "creatinine", "urea"] },
    { name: "Inflammation/Vitamins", codes: ["crp", "vitamin_d"] },
  ];

  const sections: string[] = [];
  for (const group of groups) {
    const lines = renderLatestGroup(group.name, group.codes, map, latestDay);
    if (lines.length) sections.push(lines.join("\n"));
  }

  const titleDay = formatDate(latestDay);
  const body = sections.filter(Boolean).join("\n\n");
  return `**Latest Labs — ${titleDay}**\n\n${body}`;
}

export function renderSeries(trend: LabTestSeries[], code: string, label: string): string {
  const map = getSeriesIncludingDerived(trend);
  const series = map.get(code.toLowerCase());
  if (!series) return `No ${label} found in your structured labs.`;
  const lines = (series.series || [])
    .slice()
    .sort((a, b) => (a.sample_date > b.sample_date ? -1 : a.sample_date < b.sample_date ? 1 : 0))
    .map(point => `- ${formatDate(toDayKey(point.sample_date))}: ${formatValueWithUnit(point.value, series.unit)}`);

  const latest = series.series.at(-1)?.value ?? null;
  const prev = series.series.at(-2)?.value ?? null;
  const verdict = changeDirection(code, prev, latest);
  return `**${label} across reports**\n${lines.join("\n")}\n\nVerdict: ${verdict}`;
}

export function renderCompare(trend: LabTestSeries[], dateA: string, dateB: string): string {
  const map = getSeriesIncludingDerived(trend);
  const codes = [
    "hba1c",
    "ldl",
    "hdl",
    "triglycerides",
    "total_cholesterol",
    "non_hdl",
    "egfr",
    "creatinine",
    "alt",
    "ast",
    "alp",
    "crp",
    "vitamin_d",
  ];

  const rows: string[] = [];
  for (const code of codes) {
    const label = LABELS[code] || code;
    const series = map.get(code);
    const valueA = valueOnDate(series, dateA);
    const valueB = valueOnDate(series, dateB);
    if (valueA == null && valueB == null) continue;
    const unit = series?.unit || "";
    const delta = valueA != null && valueB != null ? valueB - valueA : null;
    const pct = valueA != null && valueB != null && valueA !== 0 ? ((valueB - valueA) / Math.abs(valueA)) * 100 : null;
    const direction = changeDirection(code, valueA, valueB);
    const deltaPart =
      delta == null
        ? ""
        : ` (Δ ${formatValue(delta)}${unit ? ` ${unit}` : ""}${
            pct == null || !Number.isFinite(pct) ? "" : ` / ${formatValue(pct)}%`
          }, ${direction})`;
    rows.push(`${label}: ${valueA != null ? formatValueWithUnit(valueA, unit) : "—"} → ${valueB != null ? formatValueWithUnit(valueB, unit) : "—"}${deltaPart}`);
  }

  return `**Comparison — ${formatDate(dateA)} vs ${formatDate(dateB)}**\n${rows.join("\n")}`;
}

export function renderTrends(trend: LabTestSeries[]): string {
  const map = getSeriesIncludingDerived(trend);
  const highlights: string[] = [];
  for (const code of ORDER) {
    const series = map.get(code);
    if (!series) continue;
    const latest = series.series.at(-1);
    const prev = series.series.at(-2);
    if (!latest || !prev) continue;
    const direction = changeDirection(code, prev.value, latest.value);
    if (direction === "stable") continue;
    const pct = prev.value === 0 ? null : ((latest.value - prev.value) / Math.abs(prev.value)) * 100;
    const unit = series.unit || "";
    const badge = badgeFor(code, latest.value);
    const fragment = `${LABELS[code] || code}: ${formatValueWithUnit(prev.value, unit)} → ${formatValueWithUnit(latest.value, unit)} (${direction}${
      pct == null || !Number.isFinite(pct) ? "" : `, ${formatValue(pct)}%`
    }${badge ? ` ${badge}` : ""})`;
    highlights.push(fragment);
    if (highlights.length >= 6) break;
  }

  if (!highlights.length) {
    return `**Trends at a glance**\nNo meaningful changes detected across the latest results.`;
  }
  return `**Trends at a glance**\n${highlights.map(h => `- ${h}`).join("\n")}`;
}

function latestValue(map: Map<string, LabTestSeries>, code: string): number | null {
  const series = map.get(code);
  if (!series || !series.series.length) return null;
  const latest = series.series[series.series.length - 1];
  return typeof latest?.value === "number" ? latest.value : null;
}

export function renderSynopsis(trend: LabTestSeries[]): string {
  const map = getSeriesIncludingDerived(trend);
  const notes: string[] = [];

  const ldlStatus = classifyValue("ldl", latestValue(map, "ldl"));
  const nonHdlStatus = classifyValue("non_hdl", latestValue(map, "non_hdl"));
  const hdlStatus = classifyValue("hdl", latestValue(map, "hdl"));
  const tgStatus = classifyValue("triglycerides", latestValue(map, "triglycerides"));
  const atherogenic = (ldlStatus === "high" || nonHdlStatus === "high") && (hdlStatus === "low" || tgStatus === "high");
  if (atherogenic) {
    notes.push("- Atherogenic cluster: Elevated atherogenic cholesterol with low protective HDL/raised triglycerides.");
  }

  const hba1c = latestValue(map, "hba1c");
  if (hba1c != null && hba1c >= 5.7 && ldlStatus === "high") {
    notes.push("- Glyco-lipid overlap: HbA1c is in the prediabetic range alongside high LDL.");
  }

  const altStatus = classifyValue("alt", latestValue(map, "alt"));
  const astStatus = classifyValue("ast", latestValue(map, "ast"));
  if ((altStatus === "high" || astStatus === "high") && tgStatus === "high") {
    notes.push("- Liver overlay: Liver enzymes are raised alongside elevated triglycerides.");
  }

  const egfr = latestValue(map, "egfr");
  const creatinineStatus = classifyValue("creatinine", latestValue(map, "creatinine"));
  if ((egfr != null && egfr < 90 && egfr >= 60) || creatinineStatus === "high") {
    notes.push("- Renal watch: Kidney markers suggest monitoring is warranted.");
  }

  const crpStatus = classifyValue("crp", latestValue(map, "crp"));
  if (crpStatus === "high") {
    notes.push("- Inflammation note: CRP is elevated, which can influence lipids and other markers.");
  }

  if (!notes.length) {
    notes.push("- No combined risk patterns detected from the structured labs.");
  }

  notes.push("Please review these findings with your clinician for personalised guidance.");
  return `**How these results relate**\n${notes.join("\n")}`;
}

export function renderGaps(trend: LabTestSeries[], meta?: LabsSummaryMeta): string {
  const map = getSeriesIncludingDerived(trend);
  const days = distinctDays(trend);
  const missingByDate: string[] = [];
  for (const day of days) {
    const missing: string[] = [];
    for (const code of ORDER) {
      if (code === "non_hdl") continue;
      const series = map.get(code);
      const val = valueOnDate(series, day);
      if (val == null) missing.push(LABELS[code] || code);
    }
    if (missing.length) {
      missingByDate.push(`${formatDate(day)}: missing ${missing.join(", ")}`);
    }
  }

  const unitIssues: string[] = [];
  for (const [code, series] of map.entries()) {
    if (!series?.series?.length || code === "non_hdl") continue;
    const units = new Set(series.series.map(p => series.unit || ""));
    if (units.size > 1) {
      unitIssues.push(`${LABELS[code] || code} uses multiple units`);
    }
  }

  const totalReports = typeof meta?.total_reports === "number" ? meta.total_reports : days.length;

  const items: string[] = [];
  items.push(`- Missing tests by date: ${missingByDate.length ? missingByDate.join("; ") : "none noted"}`);
  items.push(`- Unit normalisations: ${unitIssues.length ? unitIssues.join("; ") : "consistent units"}`);
  items.push(`- Reports tracked: ${totalReports}`);

  return `**Missing or unclear**\n${items.join("\n")}`;
}

export function renderCounts(trend: LabTestSeries[], meta?: LabsSummaryMeta): string {
  const days = distinctDays(trend);
  const displayed = days.length;
  const totalReports = typeof meta?.total_reports === "number" ? meta.total_reports : displayed;
  const latest = formatDate(days[0]);
  return `**Report summary**\nReports listed: ${displayed} • Latest: ${latest}${totalReports > displayed ? ` • Total: ${totalReports}` : ""}`;
}

