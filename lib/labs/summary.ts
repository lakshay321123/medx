import { SupabaseClient } from "@supabase/supabase-js";

type TrendDirection = "improving" | "worsening" | "flat" | "unknown";
type DirectionRule = "lower" | "higher" | "neutral";

type TestDefinition = {
  test_code: string;
  test_name: string;
  direction: DirectionRule;
  kinds: string[];
};

type RawObservation = {
  kind: string;
  value_num: number | null;
  unit: string | null;
  observed_at: string | null;
  created_at: string | null;
  thread_id: string | null;
  report_id: string | null;
};

type NormalizedPoint = {
  test_code: string;
  test_name: string;
  direction: DirectionRule;
  value: number;
  unit: string;
  sample_date: string;
};

export type LabSeriesPoint = {
  value: number;
  unit: string;
  sample_date: string;
};

export type LabTrend = {
  test_code: string;
  test_name: string;
  unit: string | null;
  latest: { value: number; sample_date: string } | null;
  previous: { value: number; sample_date: string } | null;
  direction: TrendDirection;
  series: LabSeriesPoint[];
};

export type LabSummaryResult = {
  trend: LabTrend[];
  meta: { source: "observations"; points: number; total_reports: number };
};

export type LabSummaryOptions = {
  userId: string;
  tests?: string[];
  from?: string;
  to?: string;
  limit?: number;
};

const TEST_DEFINITIONS: TestDefinition[] = [
  { test_code: "LDL-C", test_name: "LDL Cholesterol", direction: "lower", kinds: ["ldl", "ldl_cholesterol"] },
  { test_code: "HDL-C", test_name: "HDL Cholesterol", direction: "higher", kinds: ["hdl", "hdl_cholesterol"] },
  { test_code: "TG", test_name: "Triglycerides", direction: "lower", kinds: ["triglycerides", "tg"] },
  { test_code: "TC", test_name: "Total Cholesterol", direction: "lower", kinds: ["total_cholesterol", "cholesterol", "cholesterol_total"] },
  { test_code: "HBA1C", test_name: "HbA1c", direction: "lower", kinds: ["hba1c"] },
  { test_code: "FBG", test_name: "Fasting Glucose", direction: "lower", kinds: ["blood_sugar_fasting", "fbg"] },
  { test_code: "CRP", test_name: "CRP", direction: "lower", kinds: ["crp", "c_reactive_protein"] },
  { test_code: "ESR", test_name: "ESR", direction: "lower", kinds: ["esr"] },
  { test_code: "ALT (SGPT)", test_name: "ALT (SGPT)", direction: "lower", kinds: ["sgpt", "alt"] },
  { test_code: "AST (SGOT)", test_name: "AST (SGOT)", direction: "lower", kinds: ["sgot", "ast"] },
  { test_code: "GGT", test_name: "GGT", direction: "lower", kinds: ["ggt"] },
  { test_code: "ALP", test_name: "ALP", direction: "lower", kinds: ["alkaline_phosphatase", "alp"] },
  { test_code: "CREAT", test_name: "Creatinine", direction: "lower", kinds: ["creatinine"] },
  { test_code: "EGFR", test_name: "EGFR", direction: "higher", kinds: ["egfr"] },
  { test_code: "UREA", test_name: "Urea", direction: "lower", kinds: ["urea"] },
  { test_code: "VITD", test_name: "Vitamin D (25-OH)", direction: "higher", kinds: ["vitamin_d", "vitamin_d_25_oh", "vitd", "25_oh_vitamin_d"] },
  { test_code: "UIBC", test_name: "UIBC", direction: "neutral", kinds: ["uibc", "unsaturated_iron_binding_capacity"] },
  { test_code: "TIBC", test_name: "TIBC", direction: "neutral", kinds: ["tibc"] },
  { test_code: "FERRITIN", test_name: "Ferritin", direction: "neutral", kinds: ["ferritin"] },
];

const KIND_TO_TEST = new Map<string, TestDefinition>();
const CODE_TO_TEST = new Map<string, TestDefinition>();
for (const def of TEST_DEFINITIONS) {
  CODE_TO_TEST.set(def.test_code, def);
  for (const kind of def.kinds) {
    KIND_TO_TEST.set(kind, def);
  }
}

function canonicalizeUnit(unit: string | null): string | null {
  if (!unit) return null;
  return unit.trim().toLowerCase().replace(/\s+/g, "");
}

function parseDate(input: string | null): Date | null {
  if (!input) return null;
  const direct = new Date(input);
  if (!Number.isNaN(direct.getTime())) return direct;
  const appended = new Date(`${input}T00:00:00Z`);
  if (!Number.isNaN(appended.getTime())) return appended;
  return null;
}

function normalizeValue(testCode: string, rawValue: number, unitInput: string | null): { value: number; unit: string } | null {
  const unitCanonical = canonicalizeUnit(unitInput);
  const value = Number(rawValue);
  if (!Number.isFinite(value)) return null;

  if (testCode === "LDL-C" || testCode === "HDL-C" || testCode === "TC") {
    if (!unitCanonical) return null;
    if (unitCanonical === "mg/dl") {
      return { value, unit: "mg/dl" };
    }
    if (unitCanonical === "mmol/l") {
      return { value: Number((value * 38.67).toFixed(2)), unit: "mg/dl" };
    }
    return null;
  }

  if (testCode === "TG") {
    if (!unitCanonical) return null;
    if (unitCanonical === "mg/dl") {
      return { value, unit: "mg/dl" };
    }
    if (unitCanonical === "mmol/l") {
      return { value: Number((value * 88.57).toFixed(2)), unit: "mg/dl" };
    }
    return null;
  }

  if (testCode === "HBA1C") {
    if (unitCanonical === "%") return { value, unit: "%" };
    return null;
  }

  const unit = unitInput?.trim() || unitCanonical || "";
  if (!unit) return null;
  return { value, unit };
}

function normalizeObservation(row: RawObservation): NormalizedPoint | null {
  const def = KIND_TO_TEST.get(row.kind);
  if (!def) return null;
  if (row.value_num === null || row.value_num === undefined) return null;
  const sampleDate = parseDate(row.observed_at) ?? parseDate(row.created_at);
  if (!sampleDate) return null;
  const normalized = normalizeValue(def.test_code, row.value_num, row.unit);
  if (!normalized) return null;
  return {
    test_code: def.test_code,
    test_name: def.test_name,
    direction: def.direction,
    value: normalized.value,
    unit: normalized.unit,
    sample_date: sampleDate.toISOString(),
  };
}

function computeDirection(rule: DirectionRule, latest: number | null, previous: number | null): TrendDirection {
  if (latest === null || previous === null) return "unknown";
  if (!Number.isFinite(latest) || !Number.isFinite(previous)) return "unknown";
  if (Math.abs(latest - previous) < 1e-9) return "flat";
  if (rule === "lower") return latest < previous ? "improving" : "worsening";
  if (rule === "higher") return latest > previous ? "improving" : "worsening";
  return "unknown";
}

function withinRange(date: string, fromTime: number | null, toTime: number | null): boolean {
  const parsed = Date.parse(date);
  if (!Number.isFinite(parsed)) return false;
  if (fromTime !== null && parsed < fromTime) return false;
  if (toTime !== null && parsed > toTime) return false;
  return true;
}

export function listSupportedTests(): string[] {
  return Array.from(CODE_TO_TEST.keys());
}

export function resolveTestCodes(input?: string[] | null): string[] | undefined {
  if (!input || input.length === 0) return undefined;
  const unique = new Set<string>();
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const code = raw.trim().toUpperCase();
    if (!code) continue;
    if (CODE_TO_TEST.has(code)) unique.add(code);
  }
  return unique.size ? Array.from(unique) : [];
}

export async function fetchLabSummary(
  client: SupabaseClient,
  options: LabSummaryOptions,
): Promise<LabSummaryResult> {
  const tests = resolveTestCodes(options.tests ?? undefined);
  if (tests && tests.length === 0) {
    return { trend: [], meta: { source: "observations", points: 0, total_reports: 0 } };
  }

  const limit = options.limit ?? 5000;

  let query = client
    .from("observations")
    .select("kind,value_num,unit,observed_at,created_at,thread_id,report_id")
    .eq("user_id", options.userId)
    .not("value_num", "is", null)
    .order("observed_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (limit > 0) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as RawObservation[];
  const reportKey = (row: RawObservation): string | null => {
    const timestamp = row.observed_at ?? row.created_at;
    if (!timestamp) return row.report_id ?? row.thread_id ?? null;
    const d = new Date(timestamp);
    if (Number.isNaN(d.getTime())) {
      return row.report_id ?? row.thread_id ?? null;
    }
    const dayIso = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
    return row.report_id ?? row.thread_id ?? dayIso;
  };

  const allReportKeys = new Set<string>();
  for (const r of rows) {
    const key = reportKey(r);
    if (key) allReportKeys.add(key);
  }

  const normalized = rows
    .map(normalizeObservation)
    .filter((p): p is NormalizedPoint => !!p);

  const fromTime = options.from ? Date.parse(`${options.from}T00:00:00Z`) : null;
  const toTime = options.to ? Date.parse(`${options.to}T23:59:59.999Z`) : null;

  const filtered = normalized.filter(point => withinRange(point.sample_date, fromTime, toTime));

  const grouped = new Map<string, NormalizedPoint[]>();
  for (const point of filtered) {
    if (tests && !tests.includes(point.test_code)) continue;
    const arr = grouped.get(point.test_code) ?? [];
    arr.push(point);
    grouped.set(point.test_code, arr);
  }

  const trend: LabTrend[] = [];
  let points = 0;
  for (const [code, pointsArr] of grouped) {
    const config = CODE_TO_TEST.get(code);
    if (!config) continue;
    const sorted = pointsArr
      .slice()
      .sort((a, b) => (a.sample_date > b.sample_date ? -1 : a.sample_date < b.sample_date ? 1 : 0));
    const primaryUnit = sorted[0]?.unit;
    const series = sorted.filter(p => !primaryUnit || p.unit === primaryUnit).map(p => ({
      value: p.value,
      unit: p.unit,
      sample_date: p.sample_date,
    }));

    if (series.length === 0) continue;

    const latest = series[0];
    const previous = series[1];
    points += series.length;

    trend.push({
      test_code: code,
      test_name: config.test_name,
      unit: primaryUnit ?? null,
      latest: latest ? { value: latest.value, sample_date: latest.sample_date } : null,
      previous: previous ? { value: previous.value, sample_date: previous.sample_date } : null,
      direction: computeDirection(config.direction, latest?.value ?? null, previous?.value ?? null),
      series,
    });
  }

  trend.sort((a, b) => {
    const aDate = a.latest?.sample_date ?? "";
    const bDate = b.latest?.sample_date ?? "";
    if (aDate > bDate) return -1;
    if (aDate < bDate) return 1;
    return a.test_name.localeCompare(b.test_name);
  });

  return { trend, meta: { source: "observations", points, total_reports: allReportKeys.size } };
}
