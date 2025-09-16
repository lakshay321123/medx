import { supabaseAdmin } from "@/lib/supabase/admin";

const DAY_MS = 86400000;

export type MeasurementKey = "ldl" | "hba1c" | "egfr" | "sbp" | "dbp" | "bmi";
export type WindowKey = "7d" | "30d" | "90d" | "365d";

export interface WindowStats {
  windowDays: number;
  n: number;
  mean: number | null;
  min: number | null;
  max: number | null;
  std: number | null;
  slopePerDay: number | null;
  freshnessDays: number | null;
}

export interface MeasurementFeature {
  key: MeasurementKey;
  unit: string | null;
  latest: { value: number; unit: string | null; observedAt: string } | null;
  windows: Record<WindowKey, WindowStats>;
}

export type MeasurementFeatureMap = Partial<Record<MeasurementKey, MeasurementFeature>>;

export interface DomainPrediction {
  condition: string;
  riskScore: number;
  riskLabel: "Low" | "Moderate" | "High" | "Unknown";
  topFactors: Array<{ name: string; detail: string }>;
  features: Record<string, MeasurementFeature>;
  model: string;
  generatedAt: string;
  summaries?: {
    patient_summary_md?: string | null;
    clinician_summary_md?: string | null;
  } | null;
}

export interface RawPatientData {
  vitals: any[];
  labs: any[];
  medications: any[];
  encounters: any[];
  notes: any[];
  observations: any[];
}

interface NormalizedMeasurement {
  key: MeasurementKey;
  value: number;
  unit: string | null;
  timestamp: number;
  source: string;
  raw: any;
}
const KEY_SYNONYMS: Record<MeasurementKey, string[]> = {
  ldl: [
    "ldl",
    "ldl_c",
    "ldlcholesterol",
    "ldl_cholesterol",
    "low_density_lipoprotein",
    "lowdensitylipoprotein",
    "ldlc",
    "ldlcalc",
    "2089_1",
    "13457_7",
  ],
  hba1c: [
    "hba1c",
    "hemoglobin_a1c",
    "ha1c",
    "glycated_hemoglobin",
    "glycosylated_hemoglobin",
    "a1c",
  ],
  egfr: [
    "egfr",
    "estimated_glomerular_filtration_rate",
    "glomerular_filtration_rate",
    "gfr",
    "48642_3",
    "33914_3",
  ],
  sbp: [
    "sbp",
    "systolic",
    "systolic_bp",
    "systolicbloodpressure",
    "blood_pressure_systolic",
    "systolic_blood_pressure",
  ],
  dbp: [
    "dbp",
    "diastolic",
    "diastolic_bp",
    "blood_pressure_diastolic",
    "diastolic_blood_pressure",
  ],
  bmi: ["bmi", "body_mass_index", "bodymassindex"],
};

function canonicalize(str: string) {
  return str
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function round(value: number, precision = 2) {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

function isFiniteNumber(value: any): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseNumber(value: any): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const match = trimmed.match(/-?\d+(?:[\.,]\d+)?/g);
    const token = match ? match[0].replace(/,/g, "") : trimmed.replace(/[^\d.-]/g, "");
    if (!token) return null;
    const parsed = Number.parseFloat(token);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function resolveField(row: any, key: string): any {
  if (!row || typeof row !== "object") return undefined;
  if (key in row) return row[key];
  const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  if (camel in row) return row[camel];
  const snake = key.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`);
  if (snake in row) return row[snake];
  const upper = key.toUpperCase();
  if (upper in row) return row[upper];
  const meta = row.meta ?? row.details ?? row.data ?? null;
  if (meta && typeof meta === "object") {
    if (key in meta) return meta[key];
    if (camel in meta) return meta[camel];
    if (snake in meta) return meta[snake];
    if (upper in meta) return meta[upper];
  }
  return undefined;
}

function pickUnit(row: any): string | null {
  const candidates = [
    "unit",
    "units",
    "unit_text",
    "unitname",
    "unit_name",
    "unitLabel",
    "measurement_unit",
    "uom",
  ];
  for (const key of candidates) {
    const val = resolveField(row, key);
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return null;
}

function pickTimestamp(row: any): number {
  const meta = row?.meta ?? row?.details ?? row?.data ?? {};
  const candidates = [
    row?.observed_at,
    row?.recorded_at,
    row?.measured_at,
    row?.taken_at,
    row?.timestamp,
    row?.event_at,
    row?.encountered_at,
    row?.started_at,
    row?.start_at,
    row?.created_at,
    row?.updated_at,
    meta?.observed_at,
    meta?.recorded_at,
    meta?.report_date,
    meta?.created_at,
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const d = new Date(candidate);
    if (!Number.isNaN(d.getTime())) return d.getTime();
  }
  return Date.now();
}

function normalizeMeasurement(
  key: MeasurementKey,
  value: number,
  unit: string | null
): { value: number; unit: string | null } | null {
  if (!isFiniteNumber(value)) return null;
  let v = value;
  let u = unit ? unit : null;
  switch (key) {
    case "ldl": {
      const unitText = (u || "").toLowerCase();
      if (unitText.includes("mmol")) {
        v = v * 38.67;
        u = "mg/dL";
      } else {
        u = "mg/dL";
      }
      if (v <= 20 || v > 600) return null;
      break;
    }
    case "hba1c": {
      if (v > 0 && v <= 1.5) {
        v = v * 100;
      }
      u = "%";
      if (v < 3 || v > 25) return null;
      break;
    }
    case "egfr": {
      u = "mL/min/1.73m²";
      if (v < 0 || v > 200) return null;
      break;
    }
    case "sbp": {
      u = "mmHg";
      if (v < 60 || v > 280) return null;
      break;
    }
    case "dbp": {
      u = "mmHg";
      if (v < 30 || v > 180) return null;
      break;
    }
    case "bmi": {
      u = "kg/m²";
      if (v < 8 || v > 90) return null;
      break;
    }
    default:
      break;
  }
  return { value: round(v, 2), unit: u };
}

function gatherCandidates(row: any, table: string): string[] {
  const fields: Array<any> = [
    row?.kind,
    row?.metric,
    row?.measurement,
    row?.measure,
    row?.type,
    row?.name,
    row?.label,
    row?.test,
    row?.code,
    row?.loinc,
    row?.analyte,
    row?.category,
    table,
  ];
  const meta = row?.meta ?? row?.details ?? row?.data ?? {};
  fields.push(
    meta?.kind,
    meta?.label,
    meta?.name,
    meta?.test,
    meta?.analyte,
    meta?.code,
    meta?.loinc,
    meta?.metric,
    meta?.type
  );
  const uniq = new Set<string>();
  for (const field of fields) {
    if (typeof field !== "string") continue;
    const canon = canonicalize(field);
    if (canon) uniq.add(canon);
  }
  return Array.from(uniq);
}

function detectKeys(row: any, table: string): Set<MeasurementKey> {
  const matched = new Set<MeasurementKey>();
  const candidates = gatherCandidates(row, table);
  for (const [key, synonyms] of Object.entries(KEY_SYNONYMS) as Array<[MeasurementKey, string[]]>) {
    if (candidates.some(c => synonyms.includes(c))) {
      matched.add(key);
    }
  }
  if (table === "vitals") {
    if (parseNumber(resolveField(row, "systolic")) != null || parseNumber(resolveField(row, "sbp")) != null) {
      matched.add("sbp");
    }
    if (parseNumber(resolveField(row, "diastolic")) != null || parseNumber(resolveField(row, "dbp")) != null) {
      matched.add("dbp");
    }
    if (parseNumber(resolveField(row, "bmi")) != null) {
      matched.add("bmi");
    }
  }
  const textual = resolveField(row, "value_text") ?? resolveField(row, "valueString") ?? resolveField(row, "reading");
  if (typeof textual === "string" && /\d+\s*\/\s*\d+/.test(textual)) {
    matched.add("sbp");
    matched.add("dbp");
  }
  return matched;
}

function extractValue(row: any, key: MeasurementKey): { value: number | null; unit: string | null } {
  const unit = pickUnit(row);
  if (key === "sbp") {
    const systolic =
      parseNumber(resolveField(row, "systolic")) ??
      parseNumber(resolveField(row, "sbp"));
    if (systolic != null) return { value: systolic, unit: unit ?? "mmHg" };
    const reading = resolveField(row, "value_text") ?? resolveField(row, "reading");
    if (typeof reading === "string") {
      const match = reading.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
      if (match) return { value: Number.parseFloat(match[1]), unit: "mmHg" };
    }
  }
  if (key === "dbp") {
    const diastolic =
      parseNumber(resolveField(row, "diastolic")) ??
      parseNumber(resolveField(row, "dbp"));
    if (diastolic != null) return { value: diastolic, unit: unit ?? "mmHg" };
    const reading = resolveField(row, "value_text") ?? resolveField(row, "reading");
    if (typeof reading === "string") {
      const match = reading.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
      if (match) return { value: Number.parseFloat(match[2]), unit: "mmHg" };
    }
  }
  if (key === "bmi") {
    const bmi = parseNumber(resolveField(row, "bmi")) ?? parseNumber(resolveField(row, "value"));
    if (bmi != null) return { value: bmi, unit: unit ?? "kg/m²" };
  }
  const valueCandidates = [
    "value",
    "value_num",
    "value_number",
    "valueNumeric",
    "result",
    "result_value",
    "quantity",
    "score",
    "measurement",
    "reading",
    "amount",
  ];
  for (const field of valueCandidates) {
    const val = parseNumber(resolveField(row, field));
    if (val != null) return { value: val, unit };
  }
  const textual = resolveField(row, "value_text") ?? resolveField(row, "valueString");
  const parsed = parseNumber(textual);
  if (parsed != null) return { value: parsed, unit };
  return { value: null, unit };
}

function ensureArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

export async function fetchPatientData(patientId: string): Promise<RawPatientData> {
  const supa = supabaseAdmin();
  const tables = ["vitals", "labs", "medications", "encounters", "notes", "observations"] as const;
  const results = await Promise.all(
    tables.map(async table => {
      try {
        const { data, error } = await supa
          .from(table)
          .select("*")
          .eq("patient_id", patientId);
        if (error) throw new Error(error.message);
        return data ?? [];
      } catch (err) {
        if (table === "observations") {
          console.warn(`predictionEngine: ${table} fetch failed`, err);
          return [];
        }
        throw err;
      }
    })
  );
  return {
    vitals: ensureArray(results[0]),
    labs: ensureArray(results[1]),
    medications: ensureArray(results[2]),
    encounters: ensureArray(results[3]),
    notes: ensureArray(results[4]),
    observations: ensureArray(results[5]),
  };
}

export function normalizeMeasurements(raw: RawPatientData): Map<MeasurementKey, NormalizedMeasurement[]> {
  const map = new Map<MeasurementKey, NormalizedMeasurement[]>();
  const push = (key: MeasurementKey, measurement: NormalizedMeasurement) => {
    const arr = map.get(key);
    if (arr) arr.push(measurement);
    else map.set(key, [measurement]);
  };
  const sources: Array<[string, any[]]> = [
    ["vitals", raw.vitals],
    ["labs", raw.labs],
    ["observations", raw.observations],
  ];
  for (const [table, rows] of sources) {
    for (const row of rows ?? []) {
      const timestamp = pickTimestamp(row);
      const matched = detectKeys(row, table);
      for (const key of matched) {
        const { value, unit } = extractValue(row, key);
        if (value == null) continue;
        const normalized = normalizeMeasurement(key, value, unit);
        if (!normalized) continue;
        push(key, {
          key,
          value: normalized.value,
          unit: normalized.unit,
          timestamp,
          source: table,
          raw: row,
        });
      }
    }
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => a.timestamp - b.timestamp);
  }
  return map;
}

function computeWindowStats(points: NormalizedMeasurement[], now: number): WindowStats {
  const values = points.map(p => p.value);
  if (values.length === 0) {
    return {
      windowDays: 0,
      n: 0,
      mean: null,
      min: null,
      max: null,
      std: null,
      slopePerDay: null,
      freshnessDays: null,
    };
  }
  const n = values.length;
  const mean = values.reduce((sum, val) => sum + val, 0) / n;
  const min = Math.min(...values);
  const max = Math.max(...values);
  let std = 0;
  if (n > 1) {
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1);
    std = Math.sqrt(Math.max(0, variance));
  }
  let slope = 0;
  if (n > 1) {
    const base = points[0].timestamp;
    const xs = points.map(p => (p.timestamp - base) / DAY_MS);
    const xMean = xs.reduce((sum, x) => sum + x, 0) / n;
    const yMean = mean;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i += 1) {
      num += (xs[i] - xMean) * (values[i] - yMean);
      den += Math.pow(xs[i] - xMean, 2);
    }
    slope = den === 0 ? 0 : num / den;
  }
  const latestTs = points[points.length - 1]?.timestamp;
  const freshness = latestTs ? (now - latestTs) / DAY_MS : null;
  return {
    windowDays: values.length,
    n,
    mean: round(mean, 2),
    min: round(min, 2),
    max: round(max, 2),
    std: n > 1 ? round(std, 2) : 0,
    slopePerDay: n > 1 ? round(slope, 4) : 0,
    freshnessDays: freshness != null ? round(freshness, 2) : null,
  };
}

export function computeMeasurementFeatures(
  series: Map<MeasurementKey, NormalizedMeasurement[]>,
  now: Date = new Date()
): MeasurementFeatureMap {
  const nowMs = now.getTime();
  const features: MeasurementFeatureMap = {};
  for (const [key, points] of series.entries()) {
    if (!points.length) continue;
    const latest = points[points.length - 1];
    const windows: Record<WindowKey, WindowStats> = {
      "7d": computeWindowStats(points.filter(p => nowMs - p.timestamp <= 7 * DAY_MS), nowMs),
      "30d": computeWindowStats(points.filter(p => nowMs - p.timestamp <= 30 * DAY_MS), nowMs),
      "90d": computeWindowStats(points.filter(p => nowMs - p.timestamp <= 90 * DAY_MS), nowMs),
      "365d": computeWindowStats(points.filter(p => nowMs - p.timestamp <= 365 * DAY_MS), nowMs),
    };
    features[key] = {
      key,
      unit: latest.unit,
      latest: {
        value: latest.value,
        unit: latest.unit,
        observedAt: new Date(latest.timestamp).toISOString(),
      },
      windows,
    };
  }
  return features;
}

function pickFeatures(source: MeasurementFeatureMap, keys: MeasurementKey[]): Record<string, MeasurementFeature> {
  const out: Record<string, MeasurementFeature> = {};
  for (const key of keys) {
    if (source[key]) out[key] = source[key]!;
  }
  return out;
}
function latestFreshnessDays(feature?: MeasurementFeature): number | null {
  if (!feature?.latest) return null;
  const ts = new Date(feature.latest.observedAt).getTime();
  if (Number.isNaN(ts)) return null;
  return (Date.now() - ts) / DAY_MS;
}

function riskLabel(score: number | null): "Low" | "Moderate" | "High" | "Unknown" {
  if (score == null) return "Unknown";
  if (score < 0.33) return "Low";
  if (score < 0.66) return "Moderate";
  return "High";
}

function severityDescending(value: number, thresholds: Array<[number, number]>): number {
  for (const [limit, severity] of thresholds) {
    if (value >= limit) return severity;
  }
  return 0;
}

function severityAscending(value: number, thresholds: Array<[number, number]>): number {
  for (const [limit, severity] of thresholds) {
    if (value <= limit) return severity;
  }
  return 0;
}

function describeFreshness(feature?: MeasurementFeature): string | null {
  const freshness = latestFreshnessDays(feature);
  if (freshness == null) return null;
  return `Last recorded ${Math.round(freshness)}d ago`;
}

function slopeDetail(stats?: WindowStats): string | null {
  if (!stats) return null;
  if (stats.slopePerDay == null) return null;
  if (Math.abs(stats.slopePerDay) < 0.01) return null;
  const sign = stats.slopePerDay > 0 ? "+" : "";
  return `slope ${sign}${round(stats.slopePerDay, 2)}/day`;
}

function buildFactor(
  name: string,
  value: number | null,
  unit: string | null,
  stats?: WindowStats
): { name: string; detail: string } | null {
  if (value == null) return null;
  const parts = [] as string[];
  parts.push(`${round(value, 2)}${unit ? ` ${unit}` : ""}`.trim());
  const slope = slopeDetail(stats);
  if (slope) parts.push(slope);
  if (stats?.freshnessDays != null) parts.push(`fresh ${round(stats.freshnessDays, 1)}d`);
  return { name, detail: parts.join("; ") };
}

export function evaluateDomains(
  features: MeasurementFeatureMap,
  now: Date = new Date()
): { predictions: DomainPrediction[]; stale: boolean } {
  const predictions: DomainPrediction[] = [];
  let stale = false;
  const generatedAt = now.toISOString();

  const cardioKeys: MeasurementKey[] = ["ldl", "sbp", "bmi"];
  const cardioRequired: MeasurementKey[] = ["ldl", "sbp"];
  const cardioFeatures = pickFeatures(features, cardioKeys);
  const cardioFresh = cardioRequired.every(k => {
    const days = latestFreshnessDays(features[k]);
    return days != null && days <= 365;
  });
  if (!cardioFresh) stale = true;
  predictions.push(cardioPrediction(cardioFeatures, generatedAt, cardioFresh));

  const metabolicKeys: MeasurementKey[] = ["hba1c", "bmi"];
  const metabolicRequired: MeasurementKey[] = ["hba1c"];
  const metabolicFeatures = pickFeatures(features, metabolicKeys);
  const metabolicFresh = metabolicRequired.every(k => {
    const days = latestFreshnessDays(features[k]);
    return days != null && days <= 365;
  });
  if (!metabolicFresh) stale = true;
  predictions.push(metabolicPrediction(metabolicFeatures, generatedAt, metabolicFresh));

  const renalKeys: MeasurementKey[] = ["egfr"];
  const renalFeatures = pickFeatures(features, renalKeys);
  const renalFresh = (() => {
    const days = latestFreshnessDays(features.egfr);
    return days != null && days <= 365;
  })();
  if (!renalFresh) stale = true;
  predictions.push(renalPrediction(renalFeatures, generatedAt, renalFresh));

  return { predictions, stale };
}

function cardioPrediction(
  features: Record<string, MeasurementFeature>,
  generatedAt: string,
  fresh: boolean
): DomainPrediction {
  const ldl = features.ldl;
  const sbp = features.sbp;
  const bmi = features.bmi;
  const weights: Array<[number, number]> = [];
  const factors: Array<{ name: string; detail: string }> = [];
  let weightSum = 0;
  if (ldl?.latest) {
    const severity = severityDescending(ldl.latest.value, [
      [190, 1],
      [160, 0.85],
      [130, 0.6],
      [100, 0.3],
    ]);
    weights.push([severity, 0.5]);
    weightSum += 0.5;
    if (severity > 0.3) {
      const detail = buildFactor("LDL (90d mean) high", ldl.windows?.["90d"]?.mean ?? ldl.latest.value, ldl.latest.unit, ldl.windows?.["90d"]);
      if (detail) factors.push(detail);
    }
  }
  if (sbp?.latest) {
    const severity = severityDescending(sbp.latest.value, [
      [170, 1],
      [160, 0.85],
      [150, 0.7],
      [140, 0.6],
      [130, 0.4],
    ]);
    weights.push([severity, 0.3]);
    weightSum += 0.3;
    if (severity > 0.3) {
      const detail = buildFactor("SBP (30d mean) elevated", sbp.windows?.["30d"]?.mean ?? sbp.latest.value, sbp.latest.unit, sbp.windows?.["30d"]);
      if (detail) factors.push(detail);
    }
  }
  if (bmi?.latest) {
    const severity = severityDescending(bmi.latest.value, [
      [40, 1],
      [35, 0.8],
      [30, 0.6],
      [27, 0.4],
    ]);
    weights.push([severity, 0.2]);
    weightSum += 0.2;
    if (severity > 0.3) {
      const detail = buildFactor("BMI high", bmi.latest.value, bmi.latest.unit, bmi.windows?.["365d"]);
      if (detail) factors.push(detail);
    }
  }

  let score: number | null = null;
  if (weightSum > 0) {
    const total = weights.reduce((sum, [sev, w]) => sum + sev * w, 0);
    score = round(total / weightSum, 3);
  }

  const label = fresh && score != null ? riskLabel(score) : "Unknown";
  if (!fresh) {
    factors.unshift({ name: "Data stale/insufficient", detail: describeFreshness(ldl) || describeFreshness(sbp) || "Key vitals older than 365d" });
  }

  return {
    condition: "Cardiovascular",
    riskScore: score ?? 0,
    riskLabel: label,
    topFactors: factors,
    features: pickFeatures(features, ["ldl", "sbp", "bmi"]),
    model: "medx-cardio-risk@2024-10-01",
    generatedAt,
  };
}

function metabolicPrediction(
  features: Record<string, MeasurementFeature>,
  generatedAt: string,
  fresh: boolean
): DomainPrediction {
  const hba1c = features.hba1c;
  const bmi = features.bmi;
  const factors: Array<{ name: string; detail: string }> = [];
  const weights: Array<[number, number]> = [];
  let weightSum = 0;

  if (hba1c?.latest) {
    const severity = severityDescending(hba1c.latest.value, [
      [9, 1],
      [8, 0.85],
      [7, 0.7],
      [6.5, 0.5],
      [6, 0.3],
    ]);
    weights.push([severity, 0.7]);
    weightSum += 0.7;
    if (severity > 0.3) {
      const detail = buildFactor("HbA1c (90d mean) high", hba1c.windows?.["90d"]?.mean ?? hba1c.latest.value, hba1c.latest.unit, hba1c.windows?.["90d"]);
      if (detail) factors.push(detail);
    }
  }
  if (bmi?.latest) {
    const severity = severityDescending(bmi.latest.value, [
      [40, 1],
      [35, 0.8],
      [30, 0.6],
      [27, 0.4],
    ]);
    weights.push([severity, 0.3]);
    weightSum += 0.3;
    if (severity > 0.3) {
      const detail = buildFactor("BMI high", bmi.latest.value, bmi.latest.unit, bmi.windows?.["365d"]);
      if (detail) factors.push(detail);
    }
  }

  let score: number | null = null;
  if (weightSum > 0) {
    const total = weights.reduce((sum, [sev, w]) => sum + sev * w, 0);
    score = round(total / weightSum, 3);
  }

  const label = fresh && score != null ? riskLabel(score) : "Unknown";
  if (!fresh) {
    factors.unshift({ name: "Data stale/insufficient", detail: describeFreshness(hba1c) || "HbA1c older than 365d" });
  }

  return {
    condition: "Metabolic",
    riskScore: score ?? 0,
    riskLabel: label,
    topFactors: factors,
    features: pickFeatures(features, ["hba1c", "bmi"]),
    model: "medx-metabolic-risk@2024-10-01",
    generatedAt,
  };
}

function renalPrediction(
  features: Record<string, MeasurementFeature>,
  generatedAt: string,
  fresh: boolean
): DomainPrediction {
  const egfr = features.egfr;
  const factors: Array<{ name: string; detail: string }> = [];
  let score: number | null = null;
  if (egfr?.latest) {
    const severity = severityAscending(egfr.latest.value, [
      [15, 1],
      [30, 0.85],
      [45, 0.7],
      [60, 0.5],
      [75, 0.3],
    ]);
    score = round(severity, 3);
    if (severity > 0.3) {
      const detail = buildFactor("eGFR low", egfr.latest.value, egfr.latest.unit, egfr.windows?.["365d"]);
      if (detail) factors.push(detail);
    }
  }
  const label = fresh && score != null ? riskLabel(score) : "Unknown";
  if (!fresh) {
    factors.unshift({ name: "Data stale/insufficient", detail: describeFreshness(egfr) || "eGFR older than 365d" });
  }
  return {
    condition: "Renal",
    riskScore: score ?? 0,
    riskLabel: label,
    topFactors: factors,
    features: pickFeatures(features, ["egfr"]),
    model: "medx-renal-risk@2024-10-01",
    generatedAt,
  };
}

export async function runPredictionEngine(patientId: string, now: Date = new Date()) {
  const raw = await fetchPatientData(patientId);
  const series = normalizeMeasurements(raw);
  const features = computeMeasurementFeatures(series, now);
  const { predictions, stale } = evaluateDomains(features, now);
  return { raw, series, features, predictions, stale };
}

export function buildCoreMetricSnapshot(features: MeasurementFeatureMap) {
  const keys: MeasurementKey[] = ["ldl", "hba1c", "egfr", "sbp", "bmi"];
  const out: Record<string, any> = {};
  for (const key of keys) {
    const feature = features[key];
    if (!feature) {
      out[key] = { value: null, unit: null, observedAt: null, freshnessDays: null };
      continue;
    }
    const freshness = latestFreshnessDays(feature);
    out[key] = {
      value: feature.latest?.value ?? null,
      unit: feature.latest?.unit ?? null,
      observedAt: feature.latest?.observedAt ?? null,
      freshnessDays: freshness != null ? round(freshness, 2) : null,
    };
  }
  return out;
}
