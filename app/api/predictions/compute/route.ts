export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";
import LLM, { type Msg } from "@/lib/LLM";
import {
  loadPatientSnapshot,
  type ObservationLine,
  type PatientProfile,
  type PatientSnapshot,
} from "@/lib/patient/snapshot";

const MODEL_NAME = process.env.LLM_MODEL_ID || "llama-3.1-70b";

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { threadId = "" } = (await req.json().catch(() => ({}))) as { threadId?: string };
    if (!threadId) {
      return NextResponse.json({ ok: false, error: "threadId required" }, { status: 400 });
    }

    const snapshotWithRaw = await loadPatientSnapshot(userId);
    if (!snapshotWithRaw) {
      throw new Error("No patient data available to compute risk summary.");
    }

    const { rawObservations: _raw, ...snapshotRest } = snapshotWithRaw;
    const snapshot: Snapshot = snapshotRest;

    const { systemPrompt, instruction, userBlock } = buildPrompts(snapshot);
    const structured = await LLM.validateJson(systemPrompt, instruction, userBlock);

    const summary = await generateSummary({ snapshot, structured });

    const supa = supabaseAdmin();
    const inserted = await savePrediction({
      supa,
      userId,
      threadId,
      snapshot,
      structured,
      summary,
    });

    await recordTimelineEvent({ supa, userId, threadId, summary, structured });

    return NextResponse.json({
      ok: true,
      prediction: inserted,
      structured,
      summary,
      snapshot,
    });
  } catch (err: any) {
    console.error("[predictions/compute]", err);
    const message = err?.message || "compute failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

type SupaClient = ReturnType<typeof supabaseAdmin>;

type Snapshot = {
  profile: PatientProfile;
  observations: ObservationLine[];
  highlights: string[];
};

type PatientProfile = {
  name: string | null;
  dob: string | null;
  age: number | null;
  sex: string | null;
  blood_group: string | null;
  chronic_conditions: string[];
  conditions_predisposition: string[];
};

type ObservationLine = {
  label: string;
  value: string;
  observedAt: string;
  category: string;
};

type Snapshot = Omit<PatientSnapshot, "rawObservations">;

function buildPrompts(snapshot: Snapshot) {
  const { profile, observations, highlights } = snapshot;

  const profileLines = [
    profileLine(profile),
    profile.chronic_conditions.length
      ? `Chronic conditions: ${profile.chronic_conditions.join(", ")}`
      : "Chronic conditions: none recorded",
    profile.conditions_predisposition.length
      ? `Family history / predisposition: ${profile.conditions_predisposition.join(", ")}`
      : "Family history / predisposition: none recorded",
  ];

  const highlightLines = highlights.length
    ? [`Key recent labs:`, ...highlights.map(h => `- ${h}`)]
    : [];

  const obsLines = observations.map(o => `- [${o.category}] ${o.label}: ${o.value} (${o.observedAt})`);

  const userBlock = [
    profileLines.join("\n"),
    highlightLines.join("\n"),
    obsLines.length ? "Observations:" : "",
    ...obsLines,
  ]
    .filter(Boolean)
    .join("\n");

  const systemPrompt = [
    "You are a clinical reasoning assistant. Analyze the patient snapshot and produce a structured overview.",
    "Use only the provided data. If data is missing or stale, acknowledge the gap.",
    "Return JSON that matches the AiDocOut schema with patient and doctor replies plus observations.",
    "Ensure medications/conditions/labs saved arrays are concise and deduplicated.",
  ].join("\n");

  const instruction =
    "Return AiDocOut JSON with {reply_patient, reply_doctor, observations:{short,long}, save:{medications,conditions,labs}}.";

  return { systemPrompt, instruction, userBlock };
}

function profileLine(profile: PatientProfile) {
  const parts = [] as string[];
  if (profile.name) parts.push(`Name: ${profile.name}`);
  if (profile.age != null) parts.push(`Age: ${profile.age}`);
  if (profile.sex) parts.push(`Sex: ${profile.sex}`);
  if (profile.blood_group) parts.push(`Blood group: ${profile.blood_group}`);
  return parts.length ? parts.join(", ") : "Demographics: not recorded";
}

async function generateSummary({
  snapshot,
  structured,
}: {
  snapshot: Snapshot;
  structured: any;
}): Promise<string> {
  const profile = profileLine(snapshot.profile);
  const highlightLines = snapshot.highlights.length
    ? snapshot.highlights.map(h => `• ${h}`).join("\n")
    : "• No recent labs captured.";

  const messages: Msg[] = [
    {
      role: "system",
      content: "You are a clinical summarizer. Produce a concise 4–6 sentence risk overview using the structured JSON provided.",
    },
    {
      role: "user",
      content: [
        `Patient profile: ${profile}`,
        "Structured JSON:",
        JSON.stringify(structured, null, 2),
        "Key labs:",
        highlightLines,
      ].join("\n\n"),
    },
  ];

  const text = await LLM.finalize(messages);
  return text || "AI summary unavailable.";
}

async function savePrediction({
  supa,
  userId,
  threadId,
  snapshot,
  structured,
  summary,
}: {
  supa: SupaClient;
  userId: string;
  threadId: string;
  snapshot: Snapshot;
  structured: any;
  summary: string;
}) {
  const payload: any = {
    user_id: userId,
    thread_id: threadId,
    model: MODEL_NAME,
    name: "AI Risk Summary",
    risk_score: null,
    band: null,
    factors: null,
    recommendations: null,
    probability: null,
    inputs_snapshot: snapshot,
    details: {
      structured,
      summary,
    },
    summary,
  };

  const { data, error } = await supa
    .from("predictions")
    .insert(payload)
    .select("id, created_at, summary, details")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function recordTimelineEvent({
  supa,
  userId,
  threadId,
  summary,
  structured,
}: {
  supa: SupaClient;
  userId: string;
  threadId: string;
  summary: string;
  structured: any;
}) {
  try {
    await supa.from("observations").insert({
      user_id: userId,
      thread_id: threadId,
      kind: "ai_summary",
      name: "AI Risk Summary",
      value_text: summary,
      observed_at: new Date().toISOString(),
      meta: {
        source: "predictions.compute",
        structured,
      },
    });
  } catch (err) {
    console.warn("[predictions/compute] timeline insert failed", err);
  }
}
