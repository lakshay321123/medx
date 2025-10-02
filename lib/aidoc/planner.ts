import type { DetectedIntent } from "@/lib/aidoc/detectIntent";

export type MaybeDate = string | Date | null | undefined;

export type PlannerLabInput = {
  id?: string | number | null;
  panel?: string | null;
  name?: string | null;
  value?: number | string | null;
  unit?: string | null;
  refLow?: number | string | null;
  refHigh?: number | string | null;
  abnormal?: string | null;
  takenAt?: MaybeDate;
  observedAt?: MaybeDate;
  sampleDate?: MaybeDate;
  createdAt?: MaybeDate;
  updatedAt?: MaybeDate;
  profileId?: string | null;
};

export type PlannerMedication = { name?: string | null; profileId?: string | null };
export type PlannerCondition = { label?: string | null; status?: string | null; profileId?: string | null };
export type PlannerNote = { body?: string | null; createdAt?: MaybeDate; updatedAt?: MaybeDate; profileId?: string | null };
export type PlannerProfile = { id?: string | null; userId?: string | null; name?: string | null; age?: number | null; sex?: string | null };

export type PlannedLab = {
  name: string;
  value: number | string | null;
  unit?: string | null;
  marker: string;
  ideal?: string | null;
};

export type PlannedReport = {
  date: string;
  summary: string;
  labs: PlannedLab[];
};

export type PlannerPatient = {
  name: string;
  age: number | null;
  sex?: string | null;
  predispositions: string[];
  medications: string[];
  symptoms: string[];
};

export type PreparedAidocPayload = {
  patient: PlannerPatient | null;
  reports: PlannedReport[];
  comparisons: Record<string, string>;
  defaultSummary: string;
};

const RANGE_TABLE: Record<string, {
  ideal: string;
  low?: number;
  high?: number;
  borderline?: { min: number; max: number };
}> = {
  LDL: { ideal: "<160 mg/dL", high: 160, borderline: { min: 130, max: 159 } },
  HDL: { ideal: ">40 mg/dL", low: 40 },
  "TOTAL CHOLESTEROL": { ideal: "<200 mg/dL", high: 200 },
  TRIGLYCERIDES: { ideal: "<150 mg/dL", high: 150, borderline: { min: 150, max: 199 } },
  HBA1C: { ideal: "<5.6%", high: 5.6, borderline: { min: 5.7, max: 6.4 } },
  "FASTING GLUCOSE": { ideal: "70-99 mg/dL", low: 70, high: 99 },
  ALT: { ideal: "<50 U/L", high: 50 },
  AST: { ideal: "<40 U/L", high: 40 },
  "VITAMIN D": { ideal: "30-100 ng/mL", low: 30, borderline: { min: 20, max: 29 } },
  "VITAMIN B12": { ideal: "200-900 pg/mL", low: 200 },
  CRP: { ideal: "<3 mg/L", high: 3 },
};

const TREND_KEYS = ["LDL", "HBA1C", "ALT", "VITAMIN D"];

function toNumber(value: number | string | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value.replace(/[^0-9.+-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeMetricName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toUpperCase();
}

function toDateLabel(input: MaybeDate): string {
  if (!input) return "unknown";
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "unknown";
  return date.toISOString().slice(0, 10);
}

function resolveTakenAt(lab: PlannerLabInput): MaybeDate {
  return lab.takenAt ?? lab.observedAt ?? lab.sampleDate ?? lab.createdAt ?? lab.updatedAt ?? null;
}

function ensureArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function filterByProfileId<T extends { profileId?: string | null }>(rows: T[], profileId: string | null): T[] {
  if (!profileId) return rows;
  return rows.filter(row => !row?.profileId || row.profileId === profileId);
}

export function idealFor(name: string): string | null {
  const range = RANGE_TABLE[normalizeMetricName(name)];
  return range?.ideal ?? null;
}

export function markerFor(name: string, value: number | string | null): string {
  const normalized = normalizeMetricName(name);
  const numeric = toNumber(value);
  const range = RANGE_TABLE[normalized];
  if (!range || numeric == null) {
    return numeric == null ? "Unknown" : "Normal";
  }
  if (range.borderline && numeric >= range.borderline.min && numeric <= range.borderline.max) {
    return "Borderline";
  }
  if (typeof range.high === "number" && numeric > range.high) {
    return "High";
  }
  if (typeof range.low === "number" && numeric < range.low) {
    return "Low";
  }
  return "Normal";
}

export function buildSingleLineSummary(labs: PlannedLab[]): string {
  const highlights = labs.filter(lab => lab.marker.toLowerCase() !== "normal");
  if (highlights.length === 0) return "All labs within expected range.";
  return highlights
    .map(lab => `${lab.name} ${lab.marker.toLowerCase()}`)
    .join("; ");
}

function sortReportsByDate(reports: PlannedReport[]): PlannedReport[] {
  return [...reports].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

function buildPatient(
  profile: PlannerProfile | null | undefined,
  conditions: PlannerCondition[] = [],
  medications: PlannerMedication[] = [],
  notes: PlannerNote[] = [],
): PlannerPatient {
  const predispositions = Array.from(
    new Set(
      conditions
        .filter(condition => condition?.label && condition.status !== "resolved")
        .map(condition => String(condition.label)),
    ),
  );
  const meds = medications.filter(med => med?.name).map(med => String(med.name));
  const symptoms = extractSymptoms(notes);
  return {
    name: profile?.name || "Unknown Patient",
    age: typeof profile?.age === "number" ? profile.age : null,
    sex: profile?.sex ?? undefined,
    predispositions,
    medications: meds,
    symptoms,
  };
}

function extractSymptoms(notes: PlannerNote[]): string[] {
  const collected: string[] = [];
  for (const note of notes) {
    const body = note?.body;
    if (!body) continue;
    const match = body.match(/symptoms?:\s*(.+)$/i);
    if (match) {
      const parts = match[1]
        .split(/[;,]/)
        .map(part => part.trim())
        .filter(Boolean);
      collected.push(...parts);
    }
  }
  return Array.from(new Set(collected));
}

function makePlannedLab(lab: PlannerLabInput): PlannedLab | null {
  const name = lab?.name?.trim();
  if (!name) return null;
  const ideal = idealFor(name);
  const marker = markerFor(name, lab?.value ?? null);
  return {
    name,
    value: lab?.value ?? null,
    unit: lab?.unit ?? undefined,
    marker,
    ideal,
  };
}

function buildReportsFromLabs(labs: PlannerLabInput[]): PlannedReport[] {
  const groups = new Map<string, PlannedLab[]>();
  for (const lab of labs) {
    const planned = makePlannedLab(lab);
    if (!planned) continue;
    const date = toDateLabel(resolveTakenAt(lab));
    if (!groups.has(date)) groups.set(date, []);
    groups.get(date)!.push(planned);
  }
  const reports: PlannedReport[] = [];
  for (const [date, labsForDate] of groups.entries()) {
    const sortedLabs = labsForDate.sort((a, b) => a.name.localeCompare(b.name));
    reports.push({
      date,
      labs: sortedLabs,
      summary: buildSingleLineSummary(sortedLabs),
    });
  }
  return sortReportsByDate(reports);
}

function toTrendString(metric: string, unit: string | null | undefined, series: { date: string; value: number }[]): string {
  if (series.length === 0) return "";
  const sorted = [...series].sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const values = sorted.map(entry => entry.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const delta = last.value - first.value;
  const normalizedMetric = normalizeMetricName(metric);
  const threshold = normalizedMetric === "HBA1C" ? 0.1 : normalizedMetric === "VITAMIN D" ? 1 : 1;
  const direction = delta > threshold ? "↑" : delta < -threshold ? "↓" : "↔";
  const unitSuffix = unit ? ` ${unit}` : "";
  return `${last.value}${unitSuffix} (${last.date}) ${direction} from ${first.value}${unitSuffix} (${first.date}); range ${min}-${max}${unitSuffix}`;
}

function collectSeries(reports: PlannedReport[]): Map<string, { metric: string; unit?: string | null; points: { date: string; value: number }[] }>
{
  const map = new Map<string, { metric: string; unit?: string | null; points: { date: string; value: number }[] }>();
  for (const report of reports) {
    for (const lab of report.labs) {
      const numeric = toNumber(lab.value);
      if (numeric == null) continue;
      const key = normalizeMetricName(lab.name);
      if (!map.has(key)) {
        map.set(key, { metric: lab.name, unit: lab.unit ?? null, points: [] });
      }
      map.get(key)!.points.push({ date: report.date, value: numeric });
      if (!map.get(key)!.unit && lab.unit) {
        map.get(key)!.unit = lab.unit;
      }
    }
  }
  return map;
}

export function buildComparisons(reports: PlannedReport[], focusMetric?: string | null): Record<string, string> {
  const map = collectSeries(reports);
  const result: Record<string, string> = {};
  const keysToUse = focusMetric ? [normalizeMetricName(focusMetric)] : TREND_KEYS;
  for (const key of keysToUse) {
    const series = map.get(key);
    if (!series) continue;
    const validPoints = series.points.filter(point => Number.isFinite(point.value));
    if (validPoints.length < 2) continue;
    const trend = toTrendString(series.metric, series.unit, validPoints);
    if (trend) result[series.metric] = trend;
  }
  if (!focusMetric) {
    for (const [key, series] of map.entries()) {
      if (result[series.metric]) continue;
      if (series.points.length < 2) continue;
      const trend = toTrendString(series.metric, series.unit, series.points);
      if (trend) result[series.metric] = trend;
    }
  } else if (!result[focusMetric] && map.has(normalizeMetricName(focusMetric))) {
    const series = map.get(normalizeMetricName(focusMetric))!;
    const trend = toTrendString(series.metric, series.unit, series.points);
    if (trend) result[series.metric] = trend;
  }
  return result;
}

function buildReportDiff(reports: PlannedReport[], window: { a: string; b: string }): Record<string, string> {
  const aReport = reports.find(report => report.date === window.a);
  const bReport = reports.find(report => report.date === window.b);
  if (!aReport || !bReport) return {};
  const map = new Map<string, { current?: PlannedLab; previous?: PlannedLab }>();
  for (const lab of aReport.labs) {
    map.set(normalizeMetricName(lab.name), { previous: lab });
  }
  for (const lab of bReport.labs) {
    const key = normalizeMetricName(lab.name);
    const existing = map.get(key) ?? {};
    existing.current = lab;
    map.set(key, existing);
  }
  const result: Record<string, string> = {};
  for (const [, pair] of map.entries()) {
    const previous = pair.previous;
    const current = pair.current;
    if (!previous && !current) continue;
    const label = current?.name ?? previous?.name;
    if (!label) continue;
    const unit = current?.unit ?? previous?.unit ?? null;
    const curVal = current?.value ?? "—";
    const prevVal = previous?.value ?? "—";
    const numericCur = toNumber(current?.value ?? null);
    const numericPrev = toNumber(previous?.value ?? null);
    const delta = numericCur != null && numericPrev != null ? numericCur - numericPrev : null;
    const arrow = delta == null ? "↔" : delta > 0 ? "↑" : delta < 0 ? "↓" : "↔";
    const unitSuffix = unit ? ` ${unit}` : "";
    result[label] = `${curVal}${unitSuffix} ${arrow} vs ${prevVal}${unitSuffix}`;
  }
  return result;
}

function appendInterpretationReports(reports: PlannedReport[], notes: PlannerNote[]): PlannedReport[] {
  const imagingNotes = notes
    .filter(note => note?.body && /x-ray|mri|ct|ultrasound|scan|imaging|fracture|biopsy|colonoscopy/i.test(note.body))
    .map(note => ({
      date: toDateLabel(note.createdAt ?? note.updatedAt ?? new Date()),
      summary: note.body!.slice(0, 160),
      labs: [],
    }));
  return sortReportsByDate([...imagingNotes, ...reports]);
}

export function prepareAidocPayload(input: {
  profile: PlannerProfile | null;
  labs: PlannerLabInput[];
  medications?: PlannerMedication[];
  conditions?: PlannerCondition[];
  notes?: PlannerNote[];
  intent: DetectedIntent;
  focusMetric?: string | null;
  compareWindow?: { a: string; b: string } | null;
}): PreparedAidocPayload {
  const profileId = input.profile?.id ?? null;
  const labs = filterByProfileId(ensureArray(input.labs), profileId);
  const medications = filterByProfileId(ensureArray(input.medications), profileId);
  const conditions = filterByProfileId(ensureArray(input.conditions), profileId);
  const notes = filterByProfileId(ensureArray(input.notes), profileId);

  let reports = buildReportsFromLabs(labs);
  if (input.intent === "interpret_report") {
    reports = appendInterpretationReports(reports, notes);
  }

  if (input.intent === "compare_reports" && input.compareWindow) {
    reports = reports.filter(report =>
      report.date === input.compareWindow!.a || report.date === input.compareWindow!.b,
    );
  }

  const comparisons =
    input.intent === "compare_reports" && input.compareWindow
      ? buildReportDiff(reports, input.compareWindow)
      : buildComparisons(reports, input.focusMetric ?? null);

  const patient = input.profile ? buildPatient(input.profile, conditions, medications, notes) : null;
  let defaultSummary = reports[0]?.summary ?? "Reports reviewed.";
  if (input.intent === "interpret_report") {
    const imagingHighlight = reports.find(report => report.labs.length === 0 && /fracture|scan|imaging|x-ray|mri/i.test(report.summary));
    if (imagingHighlight?.summary) {
      defaultSummary = imagingHighlight.summary;
    }
  }

  return { patient, reports, comparisons, defaultSummary };
}

export type NarrativeInput = {
  payload: PreparedAidocPayload;
  userText: string;
  intent: DetectedIntent;
};

export function buildNarrativePrompt({ payload, userText, intent }: NarrativeInput): {
  system: string;
  instruction: string;
  user: string;
} {
  const trimmedReports = payload.reports.slice(0, 5).map(report => ({
    date: report.date,
    summary: report.summary,
    labs: report.labs.map(lab => ({ name: lab.name, value: lab.value, unit: lab.unit, marker: lab.marker })),
  }));
  const context = {
    intent,
    question: userText,
    patient: payload.patient,
    comparisons: payload.comparisons,
    reports: trimmedReports,
  };
  const system =
    "You are AiDoc, a medical assistant summarizing structured lab data. Provide concise, patient-friendly insights and actionable next steps.";
  const instruction =
    "Summarize the patient's medical reports in 2-3 sentences and propose up to 3 practical next steps. Keep the tone reassuring.";
  const user = JSON.stringify(context);
  return { system, instruction, user };
}

export function buildNarrativeFallback(payload: PreparedAidocPayload): { summary: string; nextSteps: string[] } {
  const summary = payload.defaultSummary || "Reports reviewed.";
  const nextSteps: string[] = [];
  if (Object.keys(payload.comparisons).length > 0) {
    nextSteps.push("Review highlighted trends with your clinician.");
  }
  nextSteps.push("Maintain regular follow-up and repeat labs as advised.");
  return { summary, nextSteps: Array.from(new Set(nextSteps)) };
}
