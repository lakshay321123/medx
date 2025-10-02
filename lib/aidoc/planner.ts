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

export type MarkerValue = "High" | "Low" | "Borderline" | "Normal";

export type LabRow = {
  name: string;
  value: number | string | null;
  unit?: string;
  marker?: MarkerValue;
  ideal?: string;
};
export type ReportBlock = { date: string; labs: LabRow[]; summary: string };

export type PlannedLab = LabRow;

export type PlannedReport = ReportBlock;

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

const TREND_KEYS = ["LDL", "HbA1c", "ALT", "Vitamin D"];

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

export function idealFor(name: string): string | undefined {
  switch (name) {
    case "LDL":
      return "<160 mg/dL";
    case "HDL":
      return ">40 mg/dL";
    case "Total Cholesterol":
      return "<200 mg/dL";
    case "Triglycerides":
      return "<150 mg/dL";
    case "HbA1c":
      return "<5.6 %";
    case "ALT":
      return "<50 U/L";
    case "AST":
      return "<50 U/L";
    case "ALP":
      return "<120 U/L";
    case "Fasting Glucose":
      return "70–99 mg/dL";
    case "Vitamin D":
      return "30–100 ng/mL";
    default:
      return undefined;
  }
}

export function markerFor(name: string, value: number | null | undefined): MarkerValue | undefined {
  if (value == null || Number.isNaN(value)) return undefined;
  switch (name) {
    case "LDL":
      return value >= 160 ? "High" : value >= 130 ? "Borderline" : "Normal";
    case "HDL":
      return value < 40 ? "Low" : "Normal";
    case "Total Cholesterol":
      return value >= 200 ? "High" : "Normal";
    case "Triglycerides":
      return value >= 150 ? "High" : "Normal";
    case "HbA1c":
      return value >= 6.5 ? "High" : value >= 5.6 ? "Borderline" : "Normal";
    case "ALT":
      return value >= 50 ? "High" : "Normal";
    case "AST":
      return value >= 50 ? "High" : "Normal";
    case "ALP":
      return value >= 120 ? "High" : "Normal";
    case "Fasting Glucose":
      return value >= 100 ? "High" : value < 70 ? "Low" : "Normal";
    case "Vitamin D":
      return value < 30 ? "Low" : value > 100 ? "High" : "Normal";
    default:
      return undefined;
  }
}

export function buildSingleLineSummary(labs: LabRow[]): string {
  const highlights = labs
    .map(lab => ({ name: lab.name, marker: lab.marker }))
    .filter(lab => lab.marker && lab.marker !== "Normal")
    .slice(0, 3)
    .map(lab => `${lab.name} ${String(lab.marker).toLowerCase()}`);
  return highlights.length ? highlights.join("; ") : "All key values within normal ranges.";
}

export function previousDistinctValue(
  reports: ReportBlock[],
  metric: string,
  fromIndex: number,
): { date: string; value: number | string | null } | null {
  const currentDate = reports[fromIndex]?.date;
  if (!currentDate) return null;
  for (let i = fromIndex + 1; i < reports.length; i += 1) {
    const report = reports[i];
    if (!report || report.date === currentDate) continue;
    const hit = report.labs.find(lab => lab.name === metric && lab.value != null);
    if (hit) {
      return { date: report.date, value: hit.value ?? null };
    }
  }
  return null;
}

export function compareTrend(reports: ReportBlock[], metric: string) {
  if (!Array.isArray(reports) || reports.length === 0) return null;
  let latestIndex = -1;
  for (let i = 0; i < reports.length; i += 1) {
    if (reports[i].labs.some(lab => lab.name === metric && lab.value != null)) {
      latestIndex = i;
      break;
    }
  }
  if (latestIndex < 0) return null;
  const latestLab = reports[latestIndex].labs.find(lab => lab.name === metric && lab.value != null);
  if (!latestLab) return null;

  const latestNumeric = toNumber(latestLab.value);
  if (latestNumeric == null) return null;

  const prev = previousDistinctValue(reports, metric, latestIndex);
  if (!prev) return null;
  const prevNumeric = toNumber(prev.value);
  if (prevNumeric == null) return null;

  const numericSeries: number[] = [];
  for (const report of reports) {
    const hit = report.labs.find(lab => lab.name === metric && lab.value != null);
    if (!hit) continue;
    const val = toNumber(hit.value);
    if (val == null) continue;
    numericSeries.push(val);
  }
  if (numericSeries.length < 2) return null;
  const rangeMin = Math.min(...numericSeries);
  const rangeMax = Math.max(...numericSeries);
  const direction = latestNumeric > prevNumeric ? "↑" : latestNumeric < prevNumeric ? "↓" : "→";
  return `${metric}: ${latestLab.value} (${reports[latestIndex].date}) ${direction} from ${prev.value} (${prev.date}); range ${rangeMin}-${rangeMax}`;
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
  const numericValue = toNumber(lab?.value ?? null);
  const marker = markerFor(name, numericValue ?? null);
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



export function buildComparisons(reports: PlannedReport[], focusMetric?: string | null): Record<string, string> {
  const result: Record<string, string> = {};
  if (!Array.isArray(reports) || reports.length === 0) return result;

  const seen = new Set<string>();
  const metrics = focusMetric ? [focusMetric] : TREND_KEYS;

  for (const metric of metrics) {
    if (!metric) continue;
    const trend = compareTrend(reports, metric);
    if (trend) {
      result[metric] = trend;
      seen.add(metric);
    }
  }

  if (!focusMetric) {
    for (const report of reports) {
      for (const lab of report.labs) {
        if (!lab.name || seen.has(lab.name)) continue;
        const trend = compareTrend(reports, lab.name);
        if (trend) {
          result[lab.name] = trend;
          seen.add(lab.name);
        }
      }
    }
  } else if (focusMetric && !result[focusMetric]) {
    const trend = compareTrend(reports, focusMetric);
    if (trend) result[focusMetric] = trend;
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
