export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/getUserId";
import { prisma } from "@/lib/prisma";
import { detectIntentAndEntities, type DetectedIntent } from "@/lib/aidoc/detectIntent";
import { SAMPLE_AIDOC_DATA } from "@/lib/aidoc/structured";
import {
  prepareAidocPayload,
  buildComparisons,
  type PlannerLabInput,
  type PlannerMedication,
  type PlannerCondition,
  type PlannerNote,
  type PlannerProfile,
  idealFor,
  markerFor,
  buildSingleLineSummary,
  type LabRow,
  type ReportBlock,
  type MarkerValue,
} from "@/lib/aidoc/planner";
import { callOpenAIJson } from "@/lib/aidoc/vendor";
import { groupByIsoDate, dedupeSameDay, normUnit, normName, type LabLike } from "@/lib/aidoc/normalize";
import { AIDOC_JSON_INSTRUCTION } from "@/lib/aidoc/schema";

const MARKER_VALUES = new Set<MarkerValue>(["High", "Low", "Borderline", "Normal"]);

function toMarkerValue(value: unknown): MarkerValue | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return MARKER_VALUES.has(trimmed as MarkerValue) ? (trimmed as MarkerValue) : undefined;
}

type AiDocRequest = {
  message?: string;
  text?: string;
  profileId?: string;
  threadId?: string;
};

interface PatientBundle {
  profile: PlannerProfile | null;
  labs: PlannerLabInput[];
  notes: PlannerNote[];
  medications: PlannerMedication[];
  conditions: PlannerCondition[];
}

function ensureArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

async function safeFindMany(client: any, args: any) {
  if (!client?.findMany) return [];
  try {
    return await client.findMany(args);
  } catch {
    const fallbackArgs = { where: args?.where };
    try {
      return await client.findMany(fallbackArgs);
    } catch {
      return [];
    }
  }
}

async function loadFromPrisma(
  userId: string,
  requestedProfileId?: string | null,
): Promise<{ bundle: PatientBundle | null; clientAvailable: boolean }> {
  try {
    const profileClient: any = (prisma as any)?.patientProfile;
    if (!profileClient?.findFirst) {
      return { bundle: null, clientAvailable: false };
    }

    let profile: any = null;
    try {
      if (requestedProfileId) {
        profile = await profileClient.findFirst({ where: { id: requestedProfileId, userId } });
      } else {
        profile =
          (await profileClient.findFirst({ where: { userId, isPrimary: true } })) ??
          (await profileClient.findFirst({ where: { userId } }));
      }
    } catch {
      profile = null;
    }

    if (!profile) {
      return { bundle: null, clientAvailable: true };
    }

    const profileId = profile.id ?? null;
    const labsClient: any = (prisma as any)?.labResult;
    const noteClient: any = (prisma as any)?.note;
    const medicationClient: any = (prisma as any)?.medication;
    const conditionClient: any = (prisma as any)?.condition;

    const [labs, notes, medications, conditions] = await Promise.all([
      safeFindMany(labsClient, { where: { profileId }, orderBy: { takenAt: "desc" }, take: 1000 }),
      safeFindMany(noteClient, { where: { profileId }, orderBy: { createdAt: "desc" }, take: 200 }),
      safeFindMany(medicationClient, { where: { profileId } }),
      safeFindMany(conditionClient, { where: { profileId } }),
    ]);

    return {
      bundle: {
        profile: profile as PlannerProfile,
        labs: ensureArray(labs) as PlannerLabInput[],
        notes: ensureArray(notes) as PlannerNote[],
        medications: ensureArray(medications) as PlannerMedication[],
        conditions: ensureArray(conditions) as PlannerCondition[],
      },
      clientAvailable: true,
    };
  } catch {
    return { bundle: null, clientAvailable: true };
  }
}

async function loadPatientBundle(
  userId: string,
  requestedProfileId?: string | null,
): Promise<{ bundle: PatientBundle | null; clientAvailable: boolean }> {
  const fromPrisma = await loadFromPrisma(userId, requestedProfileId);
  if (fromPrisma.bundle) {
    return fromPrisma;
  }
  if (!fromPrisma.clientAvailable) {
    return {
      bundle: {
        profile: SAMPLE_AIDOC_DATA.profile,
        labs: SAMPLE_AIDOC_DATA.labs,
        notes: SAMPLE_AIDOC_DATA.notes,
        medications: SAMPLE_AIDOC_DATA.medications,
        conditions: SAMPLE_AIDOC_DATA.conditions,
      },
      clientAvailable: false,
    };
  }
  return { bundle: null, clientAvailable: true };
}

function sanitizeNextSteps(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => (typeof item === "string" ? item.trim() : ""))
    .filter(step => step.length > 0)
    .slice(0, 3);
}

function computeAgeFromDob(dob?: string | Date | null): number | undefined {
  if (!dob) return undefined;
  const birth = dob instanceof Date ? dob : new Date(dob);
  if (Number.isNaN(birth.getTime())) return undefined;
  const diff = Date.now() - birth.getTime();
  const ageDate = new Date(diff);
  const age = Math.abs(ageDate.getUTCFullYear() - 1970);
  return Number.isFinite(age) ? age : undefined;
}

function defaultSummaryFromComparisons(comparisons: Record<string, string>): string {
  const lines = Object.values(comparisons);
  return lines.length ? `Key trends: ${lines.join("; ")}.` : "No clear trend detected across your reports.";
}

function defaultNextSteps(comparisons: Record<string, string>): string[] {
  const steps = [
    "Review highlighted trends with your clinician.",
    "Maintain regular follow-up and repeat labs as advised.",
  ];
  if (comparisons["LDL"]) {
    steps.unshift("Repeat lipid profile in ~3 months; consider diet and lifestyle changes.");
  }
  if (comparisons["HbA1c"]) {
    steps.unshift("Monitor HbA1c in ~3–6 months and focus on glucose-friendly nutrition.");
  }
  return steps;
}

function sanitizeSummary(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/^[\s\u200B]+/g, "")
    .replace(/^thanks[^\n]*\n?/i, "")
    .replace(/^i'?ll\s+personalize[^\n]*\n?/i, "")
    .replace(/what\s+symptoms[^\n]*\??\s*$/i, "")
    .trim();
}

type ModelReport = {
  date: string;
  summary: string;
  labs: { name: string; value: number | string | null; unit?: string | null; marker?: MarkerValue }[];
};

function formatReportsForModel(reports: ModelReport[]): string {
  if (!reports.length) return "- No structured lab reports available.";
  return reports
    .slice(0, 5)
    .map(report => {
      const labDetails = report.labs
        .slice(0, 6)
        .map(lab => {
          const value = lab.value ?? "—";
          const unit = lab.unit ? ` ${lab.unit}` : "";
          const marker = lab.marker ? ` (${lab.marker})` : "";
          return `${lab.name}: ${value}${unit}${marker}`;
        })
        .join("; ");
      return `- ${report.date}: ${report.summary}${labDetails ? ` | Labs: ${labDetails}` : ""}`;
    })
    .join("\n");
}

function buildModelSystem(patient: any, reports: ModelReport[], comparisons: Record<string, string>): string {
  const patientLine = patient
    ? `Patient: ${patient.name ?? "Unknown"}; Age: ${patient.age ?? "—"}; Predispositions: ${
        patient.predispositions?.length ? patient.predispositions.join(", ") : "none"
      }; Medications: ${patient.medications?.length ? patient.medications.join(", ") : "none"}; Symptoms: ${
        patient.symptoms?.length ? patient.symptoms.join(", ") : "none"
      }.`
    : "Patient: unknown.";
  const comparisonLine = Object.values(comparisons).length
    ? Object.values(comparisons).join("; ")
    : "No longitudinal comparisons available.";
  return [
    "You are AiDoc, a clinical assistant summarizing structured lab histories.",
    "Write an integrated interpretation in 3–5 sentences that synthesizes risk areas and improvements.",
    "Do not restate the per-date summaries verbatim; highlight trends, context, and next steps.",
    patientLine,
    `Comparisons: ${comparisonLine}.`,
    "Reports:",
    formatReportsForModel(reports),
  ].join("\n");
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: AiDocRequest;
  try {
    body = (await req.json()) as AiDocRequest;
  } catch {
    body = {};
  }

  const messageInput = typeof body?.message === "string" ? body.message.trim() : "";
  const textInput = typeof body?.text === "string" ? body.text.trim() : "";
  const message = messageInput || textInput;
  if (!message) return NextResponse.json({ error: "no message" }, { status: 400 });

  const rawPid = typeof body?.profileId === "string" ? body.profileId.trim() : undefined;
  const clientPid = rawPid && rawPid.length ? rawPid : undefined;
  if (!clientPid) {
    return NextResponse.json({ error: "missing_profileId" }, { status: 400 });
  }

  const profileClient: any = (prisma as any)?.profile;
  const profile = profileClient?.findFirst
    ? await profileClient.findFirst({ where: { id: clientPid, userId } })
    : null;
  if (!profile && clientPid !== SAMPLE_AIDOC_DATA.profile.id) {
    return NextResponse.json({ error: "profile_not_found_or_not_owned" }, { status: 404 });
  }

  const { bundle } = await loadPatientBundle(userId, clientPid);
  if (!bundle) {
    return NextResponse.json({ error: "profile_not_found_or_not_owned" }, { status: 404 });
  }

  console.info("AIDOC_PROFILE", { userId, profileId: bundle.profile?.id ?? null });

  const userText = String(message || "");
  const { intent, confidence, entities } = detectIntentAndEntities(userText);
  const intentCategory: DetectedIntent = confidence < 0.35 ? "pull_reports" : intent;

  const preparedRaw = prepareAidocPayload({
    profile: bundle.profile,
    labs: bundle.labs,
    notes: bundle.notes,
    medications: bundle.medications,
    conditions: bundle.conditions,
    intent: intentCategory,
    focusMetric: entities.metric ?? null,
    compareWindow: entities.compareWindow ?? null,
  });

  const labs = ensureArray(bundle.labs) as LabLike[];
  const grouped = groupByIsoDate(labs);
  let reports: ReportBlock[] = grouped.map(([date, items]) => {
    const cleaned = dedupeSameDay(
      items.map(item => ({
        name: item?.name ?? undefined,
        value: (item as any)?.value ?? null,
        unit: (item as any)?.unit ?? null,
      })),
    );

    const labsOut: LabRow[] = [];
    for (const item of cleaned) {
      const rawValue = item.value;
      let numeric: number | null = null;
      if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
        numeric = rawValue;
      } else if (typeof rawValue === "string") {
        const parsed = Number(rawValue);
        if (!Number.isNaN(parsed)) numeric = parsed;
      }

      const displayValue: number | string | null =
        numeric ?? (typeof rawValue === "string" ? rawValue : rawValue ?? null);
      const displayName = typeof item.name === "string" ? item.name : "";
      if (!displayName) continue;
      const unit = normUnit(item.unit ?? undefined);

      const labRow: LabRow = {
        name: displayName,
        value: displayValue,
        unit,
        marker: markerFor(displayName, numeric ?? null),
        ideal: idealFor(displayName),
      };
      labsOut.push(labRow);
    }

    const summary = buildSingleLineSummary(labsOut);

    const reportBlock: ReportBlock = { date, labs: labsOut, summary };
    return reportBlock;
  });

  if (intentCategory === "compare_reports" && entities.compareWindow) {
    const { a, b } = entities.compareWindow;
    reports = reports.filter(report => report.date === a || report.date === b);
  }

  if (!reports.length && preparedRaw.reports.length) {
    reports = preparedRaw.reports.map(report => {
      const sourceLabs = Array.isArray(report.labs) ? report.labs : [];
      const labs = sourceLabs
        .map(lab => {
          const rawName = typeof lab?.name === "string" ? lab.name.trim() : "";
          if (!rawName) return null;

          const normalizedName = normName(rawName);
          if (!normalizedName) return null;

          const labRow: LabRow = {
            name: normalizedName,
            value: lab?.value ?? null,
            unit: normUnit(lab?.unit ?? undefined),
            marker: toMarkerValue(lab?.marker),
            ideal: lab?.ideal ?? undefined,
          };
          return labRow;
        })
        .filter((lab): lab is LabRow => lab !== null);
      const reportBlock: ReportBlock = {
        date: report.date,
        summary: report.summary,
        labs,
      };
      return reportBlock;
    });
  }

  if (intentCategory === "interpret_report") {
    const imagingReports = preparedRaw.reports
      .filter(report => (!report.labs || report.labs.length === 0) && report.summary)
      .map(report => ({
        date: report.date,
        summary: report.summary,
        labs: [],
      } satisfies ReportBlock));

    if (imagingReports.length) {
      const labReports = reports.filter(report => report.labs.length > 0);
      labReports.sort((a, b) => b.date.localeCompare(a.date));
      imagingReports.sort((a, b) => b.date.localeCompare(a.date));
      reports = [...imagingReports, ...labReports];
    } else {
      reports.sort((a, b) => b.date.localeCompare(a.date));
    }
  } else {
    reports.sort((a, b) => b.date.localeCompare(a.date));
  }

  const focusMetric = intentCategory === "compare_metric" ? entities.metric ?? null : null;
  const comparisons = buildComparisons(reports, focusMetric);

  const profile: any = bundle.profile ?? {};
  const predispositions = Array.isArray(profile?.conditions_predisposition)
    ? profile.conditions_predisposition.filter(Boolean)
    : preparedRaw.patient?.predispositions ?? [];
  const chronicConditions = Array.isArray(profile?.chronic_conditions)
    ? profile.chronic_conditions.filter(Boolean)
    : (preparedRaw.patient as any)?.conditions ?? [];
  const medicationsList = ensureArray(bundle.medications)
    .map((med: any) => med?.name)
    .filter((name: any): name is string => typeof name === "string" && name.length > 0);
  const patient = preparedRaw.patient
    ? {
        ...preparedRaw.patient,
        name: profile?.fullName ?? profile?.name ?? preparedRaw.patient.name,
        age: profile?.dob ? computeAgeFromDob(profile.dob) ?? preparedRaw.patient.age : preparedRaw.patient.age,
        predispositions,
        medications: medicationsList.length ? medicationsList : preparedRaw.patient.medications ?? [],
        symptoms: preparedRaw.patient.symptoms ?? [],
        conditions: chronicConditions,
      }
    : null;

  const modelReports: ModelReport[] = reports.map(report => ({
    date: report.date,
    summary: report.summary,
    labs: report.labs.map(lab => ({
      name: lab.name,
      value: lab.value,
      unit: lab.unit ?? null,
      marker: lab.marker,
    })),
  }));

  const system = buildModelSystem(patient, modelReports, comparisons);
  let summary = defaultSummaryFromComparisons(comparisons);
  let nextSteps = defaultNextSteps(comparisons);

  try {
    const ai = await callOpenAIJson({
      system,
      user:
        "Write a short (3–5 sentence) clinical interpretation using only the provided patient card, reports, and comparisons. Do not ask questions and avoid coaching phrases like 'thanks' or 'what symptoms'.",
      instruction: AIDOC_JSON_INSTRUCTION,
      metadata: { feature: "pull_reports" },
    });
    const rawSummary = sanitizeSummary(ai?.reply);
    if (rawSummary && rawSummary.split(/\s+/).length >= 15) {
      summary = rawSummary;
    }
    const aiNotes = sanitizeNextSteps((ai as any)?.save?.notes ?? (ai as any)?.nextSteps);
    if (aiNotes.length) {
      nextSteps = aiNotes;
    }
  } catch (error) {
    console.error("aidoc_summary_error", error);
  }

  const response = {
    kind: "reports" as const,
    intent: intentCategory,
    confidence,
    patient,
    reports,
    comparisons,
    summary,
    nextSteps,
    reply: summary,
    entities,
  };

  return NextResponse.json(response);
}
