export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { detectIntentAndEntities, type DetectedIntent } from "@/lib/aidoc/detectIntent";
import {
  buildComparisons,
  buildSingleLineSummary,
  idealFor,
  markerFor,
  type LabRow,
  type ReportBlock,
  type MarkerValue,
} from "@/lib/aidoc/planner";
import { callOpenAIJson } from "@/lib/aidoc/vendor";
import { groupByIsoDate, dedupeSameDay, normUnit, type LabLike } from "@/lib/aidoc/normalize";
import { AIDOC_JSON_INSTRUCTION } from "@/lib/aidoc/schema";

function sanitizeNextSteps(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => (typeof item === "string" ? item.trim() : ""))
    .filter(step => step.length > 0)
    .slice(0, 3);
}

function computeAgeFromDob(dob?: string | Date | null): number | null {
  if (!dob) return null;
  const birth = dob instanceof Date ? dob : new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const diff = Date.now() - birth.getTime();
  const ageDate = new Date(diff);
  const age = Math.abs(ageDate.getUTCFullYear() - 1970);
  return Number.isFinite(age) ? age : null;
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
  const body = (await req.json().catch(() => ({}))) as { message?: string; text?: string; profileId?: string };

  const message = String(body.message ?? body.text ?? "");
  const userText = message.trim();
  if (!userText) {
    return NextResponse.json({ error: "no_message" }, { status: 400 });
  }

  let profile: { id: string } | null = null;

  if (body.profileId?.trim()) {
    profile = await prisma.profile.findFirst({
      where: { id: body.profileId.trim() },
      select: { id: true },
    });
  }
  if (!profile) {
    profile = await prisma.profile.findFirst({
      where: {},
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      select: { id: true },
    });
  }
  if (!profile) {
    return NextResponse.json({ error: "no_profile_available" }, { status: 404 });
  }

  const [labs, meds, prof] = await Promise.all([
    prisma.labResult.findMany({
      where: { profileId: profile.id },
      orderBy: { takenAt: "desc" },
      take: 1000,
    }),
    prisma.medication.findMany({
      where: { profileId: profile.id, active: true },
      orderBy: { startedAt: "desc" },
    }),
    prisma.profile.findFirst({
      where: { id: profile.id },
      select: {
        full_name: true,
        dob: true,
        sex: true,
        blood_group: true,
        chronic_conditions: true,
        conditions_predisposition: true,
      },
    }),
  ]);

  const labLikes: LabLike[] = Array.isArray(labs)
    ? labs.map(lab => ({
        name: lab?.name ?? undefined,
        value: (lab as any)?.value ?? null,
        unit: (lab as any)?.unit ?? null,
        takenAt: (lab as any)?.takenAt ?? null,
      }))
    : [];

  const grouped = groupByIsoDate(labLikes);
  let reports: ReportBlock[] = grouped.map(([date, items]) => {
    const cleaned = dedupeSameDay(items);
    const labsOut: LabRow[] = [];
    for (const item of cleaned) {
      const displayName = typeof item.name === "string" ? item.name : "";
      if (!displayName) continue;

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

      const labRow: LabRow = {
        name: displayName,
        value: displayValue,
        unit: typeof item.unit === "string" ? normUnit(item.unit) : undefined,
        marker: markerFor(displayName, numeric ?? null),
        ideal: idealFor(displayName),
      };
      labsOut.push(labRow);
    }

    const summary = buildSingleLineSummary(labsOut);
    return { date, labs: labsOut, summary } satisfies ReportBlock;
  });

  const { intent, confidence, entities } = detectIntentAndEntities(userText);
  const intentCategory: DetectedIntent = confidence < 0.35 ? "pull_reports" : intent;

  if (intentCategory === "compare_reports" && entities.compareWindow) {
    const { a, b } = entities.compareWindow;
    reports = reports.filter(report => report.date === a || report.date === b);
  }

  reports.sort((a, b) => b.date.localeCompare(a.date));

  const focusMetric = intentCategory === "compare_metric" ? entities.metric ?? null : null;
  const comparisons = buildComparisons(reports, focusMetric);

  const predispositions = Array.isArray(prof?.conditions_predisposition)
    ? prof!.conditions_predisposition.filter(Boolean)
    : [];
  const chronicConditions = Array.isArray(prof?.chronic_conditions)
    ? prof!.chronic_conditions.filter(cond => cond && !predispositions.includes(cond))
    : [];
  const medicationNames = Array.isArray(meds)
    ? meds
        .map(med => (med as any)?.name)
        .filter((name): name is string => typeof name === "string" && name.trim().length > 0)
    : [];

  const patient = prof
    ? {
        name: prof.full_name ?? undefined,
        age: computeAgeFromDob(prof.dob),
        sex: prof.sex ?? undefined,
        predispositions,
        medications: medicationNames,
        symptoms: [] as string[],
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

  return NextResponse.json({
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
  });
}
