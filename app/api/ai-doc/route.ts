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
  buildNarrativeFallback,
  buildNarrativePrompt,
  type PlannerLabInput,
  type PlannerMedication,
  type PlannerCondition,
  type PlannerNote,
  type PlannerProfile,
} from "@/lib/aidoc/planner";
import { callOpenAIJson } from "@/lib/aidoc/vendor";
import { normName, normUnit, type LabLike } from "@/lib/aidoc/normalize";

// --- Ideal ranges (minimal starter; expand later) ---
function idealFor(name: string): string | undefined {
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

function markerFor(
  name: string,
  value: number | null | undefined,
): "High" | "Low" | "Borderline" | "Normal" | undefined {
  if (value == null) return undefined;
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

// --- De-duplication per date ---
// If the SAME (normalized) test repeats, keep the latest occurrence for that date.
// Key: `${name}|${unit}`; if values differ same day, keep the last seen (DB orderBy desc handles "latest first").
function dedupeLabs(items: LabLike[]): LabLike[] {
  const map = new Map<string, LabLike>();
  for (const item of items) {
    const name = normName(item.name);
    if (!name) continue;
    const unit = normUnit(item.unit ?? undefined);
    const key = `${name}|${unit || ""}`;
    map.set(key, { ...item, name, unit });
  }
  return [...map.values()];
}

function toNumeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.+-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function buildSingleLineSummary(labs: { name: string; marker?: string | null | undefined }[]): string {
  const highlights = labs
    .map(lab => ({ name: lab.name, marker: lab.marker }))
    .filter(lab => lab.marker && lab.marker !== "Normal");
  if (!highlights.length) return "All key values within normal ranges.";
  return highlights
    .slice(0, 3)
    .map(lab => `${lab.name} ${String(lab.marker).toLowerCase()}`)
    .join("; ");
}

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

async function loadFromPrisma(userId: string): Promise<PatientBundle | null> {
  try {
    const profileClient: any = (prisma as any)?.patientProfile;
    if (!profileClient?.findFirst) return null;
    const profile = (await profileClient.findFirst({ where: { userId } })) ?? null;
    if (!profile) return null;
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
      profile: profile as PlannerProfile,
      labs: ensureArray(labs) as PlannerLabInput[],
      notes: ensureArray(notes) as PlannerNote[],
      medications: ensureArray(medications) as PlannerMedication[],
      conditions: ensureArray(conditions) as PlannerCondition[],
    };
  } catch {
    return null;
  }
}

async function loadPatientBundle(userId: string): Promise<PatientBundle> {
  const fromPrisma = await loadFromPrisma(userId);
  if (fromPrisma) return fromPrisma;
  return {
    profile: SAMPLE_AIDOC_DATA.profile,
    labs: SAMPLE_AIDOC_DATA.labs,
    notes: SAMPLE_AIDOC_DATA.notes,
    medications: SAMPLE_AIDOC_DATA.medications,
    conditions: SAMPLE_AIDOC_DATA.conditions,
  };
}

function sanitizeNextSteps(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => (typeof item === "string" ? item.trim() : ""))
    .filter(step => step.length > 0)
    .slice(0, 3);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) return NextResponse.json({ error: "no message" }, { status: 400 });

  const userText = String(message || "");
  const { intent, confidence, entities } = detectIntentAndEntities(userText);
  const intentCategory: DetectedIntent = confidence < 0.35 ? "pull_reports" : intent;

  const bundle = await loadPatientBundle(userId);

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

  const cleanedReports = preparedRaw.reports.map(report => {
    const cleaned = dedupeLabs(
      report.labs.map(lab => ({
        name: lab.name,
        value: lab.value ?? null,
        unit: lab.unit ?? null,
      })),
    );

    const labsOut = cleaned
      .map(item => {
        const displayName = item.name ? String(item.name) : "";
        const numericValue = toNumeric(item.value ?? null);
        const marker = markerFor(displayName, numericValue ?? null);
        return {
          name: displayName,
          value:
            typeof item.value === "number" || typeof item.value === "string"
              ? item.value
              : numericValue,
          unit: normUnit(item.unit ?? undefined),
          marker: marker ?? "Normal",
          ideal: idealFor(displayName),
        };
      })
      .filter(lab => lab.name);

    const summary = buildSingleLineSummary(labsOut);

    return {
      ...report,
      labs: labsOut,
      summary,
    };
  });

  const prepared = {
    ...preparedRaw,
    reports: cleanedReports,
    defaultSummary: cleanedReports[0]?.summary ?? preparedRaw.defaultSummary,
  };

  let summaryPack = buildNarrativeFallback(prepared);

  try {
    const { system, instruction, user } = buildNarrativePrompt({ payload: prepared, userText, intent: intentCategory });
    const ai = await callOpenAIJson({ system, instruction, user, metadata: { intent: intentCategory, source: "aidoc_reports" } });
    const aiSummary = typeof ai?.summary === "string" ? ai.summary.trim() : typeof ai?.reply === "string" ? ai.reply.trim() : "";
    const aiNext = sanitizeNextSteps(ai?.nextSteps);
    if (aiSummary) {
      summaryPack = { summary: aiSummary, nextSteps: aiNext.length ? aiNext : summaryPack.nextSteps };
    } else if (aiNext.length) {
      summaryPack = { summary: summaryPack.summary, nextSteps: aiNext };
    }
  } catch (error) {
    console.error("aidoc_summary_error", error);
  }

  const response = {
    kind: "reports" as const,
    intent: intentCategory,
    confidence,
    patient: prepared.patient,
    reports: prepared.reports,
    comparisons: prepared.comparisons,
    summary: summaryPack.summary,
    nextSteps: summaryPack.nextSteps,
    reply: summaryPack.summary,
    entities,
  };

  return NextResponse.json(response);
}
