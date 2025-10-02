import { AiDocIntent, detectAidocIntent } from "./schema";
import { computeTrendStats, describeTrend } from "./trends";

type MaybeDate = string | Date | null | undefined;

type LabRow = {
  name?: string | null;
  value?: number | string | null;
  unit?: string | null;
  refLow?: number | null;
  refHigh?: number | null;
  abnormal?: string | null;
  takenAt?: MaybeDate;
};

type NoteRow = {
  body?: string | null;
  createdAt?: MaybeDate;
  updatedAt?: MaybeDate;
};

type MedicationRow = { name?: string | null };

type ConditionRow = { label?: string | null; status?: string | null };

type ProfileRow = { name?: string | null; age?: number | null; sex?: string | null };

type StructuredLab = {
  name: string;
  value: number | string | null;
  unit?: string | null;
  marker: string;
  ideal?: string;
};

type StructuredReport = {
  date: string;
  summary: string;
  labs: StructuredLab[];
};

type StructuredPatient = {
  name: string;
  age: number | null;
  sex?: string | null;
  predispositions: string[];
  medications: string[];
  symptoms: string[];
};

export type StructuredAidocResponse = {
  kind: "reports";
  intent: AiDocIntent;
  patient: StructuredPatient | null;
  reports: StructuredReport[];
  comparisons: Record<string, string>;
  summary: string;
  nextSteps: string[];
};

const DEFAULT_SUMMARY = "Reports reviewed.";

function toDateLabel(input: MaybeDate): string {
  if (!input) return "unknown";
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "unknown";
  return date.toISOString().slice(0, 10);
}

function markerForLab(lab: LabRow): { marker: string; ideal?: string } {
  const value = typeof lab.value === "number" ? lab.value : Number(lab.value);
  const refLow = typeof lab.refLow === "number" ? lab.refLow : undefined;
  const refHigh = typeof lab.refHigh === "number" ? lab.refHigh : undefined;
  let marker = "Normal";
  if (lab.abnormal && typeof lab.abnormal === "string") {
    marker = lab.abnormal.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  } else if (!Number.isNaN(value)) {
    if (typeof refHigh === "number" && value > refHigh) marker = "High";
    else if (typeof refLow === "number" && value < refLow) marker = "Low";
  }
  let ideal: string | undefined;
  if (typeof refLow === "number" && typeof refHigh === "number") ideal = `${refLow}-${refHigh}`;
  else if (typeof refHigh === "number") ideal = `<${refHigh}`;
  else if (typeof refLow === "number") ideal = `>${refLow}`;
  return { marker, ideal };
}

function summarizeLabs(labs: StructuredLab[]): string {
  const highlights = labs.filter((lab) => lab.marker.toLowerCase() !== "normal");
  if (highlights.length === 0) {
    return "All labs are within expected limits.";
  }
  const phrases = highlights.map((lab) => `${lab.name} ${lab.marker.toLowerCase()}`);
  return `Key findings: ${phrases.join(", ")}.`;
}

function groupLabsByDate(labs: LabRow[]): StructuredReport[] {
  const groups = new Map<string, StructuredLab[]>();
  for (const lab of labs) {
    if (!lab?.name) continue;
    const date = toDateLabel(lab.takenAt);
    const { marker, ideal } = markerForLab(lab);
    const record: StructuredLab = {
      name: lab.name,
      value: lab.value ?? null,
      unit: lab.unit ?? undefined,
      marker,
      ideal,
    };
    if (!groups.has(date)) groups.set(date, []);
    groups.get(date)!.push(record);
  }
  return Array.from(groups.entries())
    .map(([date, labsForDate]) => ({
      date,
      summary: summarizeLabs(labsForDate),
      labs: labsForDate.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

function extractSymptoms(notes: NoteRow[]): string[] {
  const out: string[] = [];
  for (const note of notes) {
    const body = note?.body;
    if (!body) continue;
    const match = body.match(/symptoms?:\s*(.+)$/i);
    if (match) {
      const parts = match[1]
        .split(/[;,]/)
        .map((part) => part.trim())
        .filter(Boolean);
      out.push(...parts);
    }
  }
  return Array.from(new Set(out));
}

function buildPatient(
  profile: ProfileRow | null | undefined,
  conditions: ConditionRow[] = [],
  medications: MedicationRow[] = [],
  notes: NoteRow[] = [],
): StructuredPatient {
  const predispositions = conditions
    .filter((condition) => condition?.label && condition.status !== "resolved")
    .map((condition) => String(condition.label));
  const meds = medications
    .filter((med) => med?.name)
    .map((med) => String(med.name!));
  const symptoms = extractSymptoms(notes);
  return {
    name: profile?.name || "Unknown Patient",
    age: typeof profile?.age === "number" ? profile!.age! : null,
    sex: profile?.sex ?? null,
    predispositions,
    medications: meds,
    symptoms,
  };
}

function normalizeMetricName(metric: string): string {
  return metric.trim().replace(/\s+/g, " ").toUpperCase();
}

function extractMetricFromQuery(message: string): string | null {
  const metricMatch = message.match(/compare\s+(?:my\s+)?([a-z0-9%\s]+)/i);
  if (metricMatch) {
    return normalizeMetricName(metricMatch[1]);
  }
  return null;
}

function buildMetricComparison(metric: string, labs: LabRow[]): string | null {
  const normalizedMetric = normalizeMetricName(metric);
  const series = labs.filter((lab) => normalizeMetricName(lab?.name || "") === normalizedMetric);
  if (series.length < 2) return null;
  const stats = computeTrendStats(
    series.map((lab) => ({
      date: toDateLabel(lab.takenAt),
      value: Number(lab.value),
      unit: lab.unit ?? null,
    })),
  );
  return describeTrend(normalizedMetric, stats);
}

function buildComparisons(intent: AiDocIntent, message: string, labs: LabRow[]): Record<string, string> {
  const comparisons: Record<string, string> = {};
  if (!Array.isArray(labs) || labs.length === 0) return comparisons;
  if (intent === AiDocIntent.CompareMetric) {
    const metric = extractMetricFromQuery(message);
    if (metric) {
      const trend = buildMetricComparison(metric, labs);
      if (trend) comparisons[metric] = trend;
    }
    return comparisons;
  }
  const grouped = new Map<string, string>();
  for (const lab of labs) {
    if (!lab?.name) continue;
    const trend = buildMetricComparison(String(lab.name), labs);
    if (trend) grouped.set(normalizeMetricName(lab.name), trend);
  }
  for (const [metric, summary] of grouped.entries()) {
    comparisons[metric] = summary;
  }
  return comparisons;
}

function buildSummary(
  intent: AiDocIntent,
  patient: StructuredPatient | null,
  reports: StructuredReport[],
  comparisons: Record<string, string>,
  notes: NoteRow[],
): string {
  const fragments: string[] = [];
  if (patient) {
    const predispositionText = patient.predispositions.length
      ? `Key conditions: ${patient.predispositions.join(", ")}.`
      : null;
    if (predispositionText) fragments.push(predispositionText);
  }
  if (Object.keys(comparisons).length > 0) {
    const sample = Object.values(comparisons)[0];
    fragments.push(`Trends: ${sample}.`);
  }
  if (intent === AiDocIntent.InterpretReport) {
    const note = notes.find((entry) => entry?.body && /fracture|injur|imaging|scan/i.test(entry.body));
    if (note?.body) {
      fragments.push(`Report interpretation: ${note.body}`);
    }
  }
  if (!fragments.length && reports.length) {
    fragments.push(reports[0].summary);
  }
  return fragments.join(" ") || DEFAULT_SUMMARY;
}

function buildNextSteps(
  intent: AiDocIntent,
  comparisons: Record<string, string>,
  reports: StructuredReport[],
  notes: NoteRow[],
): string[] {
  const steps = new Set<string>();
  for (const summary of Object.values(comparisons)) {
    if (/rising/.test(summary.toLowerCase())) {
      steps.add("Recheck labs in 3 months to monitor rising trend.");
    }
    if (/falling/.test(summary.toLowerCase())) {
      steps.add("Continue current management and reassess next visit.");
    }
  }
  if (intent === AiDocIntent.InterpretReport) {
    steps.add("Follow orthopedic guidance and resume activities gradually.");
    if (notes.some((note) => note?.body && /healed/.test(note.body))) {
      steps.add("Maintain strengthening exercises to support recovery.");
    }
  }
  if (!steps.size && reports.length) {
    const abnormalReport = reports.find((report) => /key findings/i.test(report.summary));
    if (abnormalReport) {
      steps.add("Discuss highlighted abnormalities with your clinician.");
    }
  }
  if (!steps.size) steps.add("Maintain regular follow-up based on your doctor's advice.");
  return Array.from(steps);
}

function combineReports(
  intent: AiDocIntent,
  labReports: StructuredReport[],
  notes: NoteRow[],
): StructuredReport[] {
  if (intent !== AiDocIntent.InterpretReport) return labReports;
  const interpretNotes = notes
    .filter((note) => note?.body && /fracture|imaging|scan|injur/i.test(note.body))
    .map((note) => ({
      date: toDateLabel(note.createdAt || note.updatedAt || new Date()),
      summary: note.body?.trim() || "Imaging report",
      labs: [],
    }));
  return [...interpretNotes, ...labReports];
}

export type StructuredBuildInput = {
  profile?: ProfileRow | null;
  labs?: LabRow[];
  notes?: NoteRow[];
  medications?: MedicationRow[];
  conditions?: ConditionRow[];
  message: string;
  intent?: AiDocIntent | null;
};

export function buildStructuredAidocResponse(input: StructuredBuildInput): StructuredAidocResponse {
  const intent = input.intent ?? detectAidocIntent(input.message) ?? AiDocIntent.HealthSummary;
  const labs = input.labs ?? [];
  const notes = input.notes ?? [];
  const patient = input.profile ? buildPatient(input.profile, input.conditions, input.medications, notes) : null;
  const labReports = groupLabsByDate(labs);
  const reports = combineReports(intent, labReports, notes);
  const comparisons = buildComparisons(intent, input.message, labs);
  const summary = buildSummary(intent, patient, reports, comparisons, notes);
  const nextSteps = buildNextSteps(intent, comparisons, reports, notes);
  return {
    kind: "reports",
    intent,
    patient,
    reports,
    comparisons,
    summary,
    nextSteps,
  };
}

export const SAMPLE_AIDOC_DATA = {
  profile: { name: "Lakshay Mehra", age: 32 },
  labs: [
    {
      name: "LDL",
      value: 182,
      unit: "mg/dL",
      refLow: 0,
      refHigh: 160,
      takenAt: "2025-10-01",
    },
    {
      name: "LDL",
      value: 160,
      unit: "mg/dL",
      refLow: 0,
      refHigh: 160,
      takenAt: "2025-05-01",
    },
    {
      name: "HbA1c",
      value: 6.2,
      unit: "%",
      refLow: 4.0,
      refHigh: 6.0,
      takenAt: "2025-10-01",
    },
  ],
  notes: [
    {
      body: "Fracture report: Right forearm fracture, radius shaft. Healed with immobilization.",
      createdAt: "2025-07-15",
    },
  ],
  medications: [{ name: "Timolol" }],
  conditions: [{ label: "Blood cancer", status: "active" }],
};
