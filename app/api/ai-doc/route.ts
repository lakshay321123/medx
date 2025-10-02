export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/getUserId";
import { prisma } from "@/lib/prisma";
import { detectIntentAndEntities } from "@/lib/aidoc/detectIntent";
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

  const bundle = await loadPatientBundle(userId);

  const prepared = prepareAidocPayload({
    profile: bundle.profile,
    labs: bundle.labs,
    notes: bundle.notes,
    medications: bundle.medications,
    conditions: bundle.conditions,
    intent,
    focusMetric: entities.metric ?? null,
    compareWindow: entities.compareWindow ?? null,
  });

  let summaryPack = buildNarrativeFallback(prepared);

  try {
    const { system, instruction, user } = buildNarrativePrompt({ payload: prepared, userText, intent });
    const ai = await callOpenAIJson({ system, instruction, user, metadata: { intent, source: "aidoc_reports" } });
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
    intent,
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
