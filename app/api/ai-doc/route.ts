export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/getUserId";
import { prisma } from "@/lib/prisma";
import { AiDocIntent, detectAidocIntent } from "@/lib/aidoc/schema";
import { AiDocPrompts, AiDocIntentCategory } from "@/lib/aidoc/intents";
import { buildStructuredAidocResponse, SAMPLE_AIDOC_DATA } from "@/lib/aidoc/structured";

interface PatientBundle {
  profile: any;
  labs: any[];
  notes: any[];
  medications: any[];
  conditions: any[];
}

function ensureArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function detectIntent(query: string): AiDocIntentCategory {
  const q = query.toLowerCase();
  for (const [cat, prompts] of Object.entries(AiDocPrompts)) {
    for (const p of prompts) {
      if (q.includes(p.toLowerCase())) {
        return cat as AiDocIntentCategory;
      }
    }
  }
  return "pull_reports";
}

function mapIntentCategoryToIntent(intent: AiDocIntentCategory): AiDocIntent | null {
  switch (intent) {
    case "pull_reports":
      return AiDocIntent.PullReports;
    case "compare_metric":
      return AiDocIntent.CompareMetric;
    case "compare_reports":
      return AiDocIntent.CompareReports;
    case "health_summary":
    case "medications":
    case "conditions":
    case "lifestyle":
    case "tips":
    case "vitals":
      return AiDocIntent.HealthSummary;
    case "interpret_report":
    case "imaging":
      return AiDocIntent.InterpretReport;
    default:
      return null;
  }
}

async function loadFromPrisma(userId: string): Promise<PatientBundle | null> {
  try {
    const profileClient: any = (prisma as any)?.patientProfile;
    if (!profileClient?.findFirst) return null;
    const profile = await profileClient.findFirst({ where: { userId } });
    if (!profile) return null;
    const labsClient: any = (prisma as any)?.labResult;
    const noteClient: any = (prisma as any)?.note;
    const medicationClient: any = (prisma as any)?.medication;
    const conditionClient: any = (prisma as any)?.condition;
    const [labs, notes, medications, conditions] = await Promise.all([
      labsClient?.findMany ? labsClient.findMany({ where: { profileId: profile.id } }) : Promise.resolve([]),
      noteClient?.findMany ? noteClient.findMany({ where: { profileId: profile.id } }) : Promise.resolve([]),
      medicationClient?.findMany
        ? medicationClient.findMany({ where: { profileId: profile.id } })
        : Promise.resolve([]),
      conditionClient?.findMany
        ? conditionClient.findMany({ where: { profileId: profile.id } })
        : Promise.resolve([]),
    ]);
    return {
      profile,
      labs: ensureArray(labs),
      notes: ensureArray(notes),
      medications: ensureArray(medications),
      conditions: ensureArray(conditions),
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

  const intentCategory = detectIntent(message);

  switch (intentCategory) {
    case "pull_reports":
      // return reports[]
      break;
    case "compare_metric":
      // return comparisons for metric
      break;
    case "compare_reports":
      // return differences between reports
      break;
    case "health_summary":
      // return AI summary
      break;
    case "interpret_report":
      // handle non-lab report (X-ray, MRI)
      break;
    case "medications":
    case "conditions":
    case "lifestyle":
    case "tips":
    case "vitals":
    case "imaging":
    default:
      break;
  }

  const intent =
    mapIntentCategoryToIntent(intentCategory) ?? detectAidocIntent(message) ?? AiDocIntent.HealthSummary;
  const bundle = await loadPatientBundle(userId);

  const structured = buildStructuredAidocResponse({
    profile: bundle.profile,
    labs: bundle.labs,
    notes: bundle.notes,
    medications: bundle.medications,
    conditions: bundle.conditions,
    message,
    intent,
  });

  return NextResponse.json({
    ...structured,
    reply: structured.summary,
  });
}
