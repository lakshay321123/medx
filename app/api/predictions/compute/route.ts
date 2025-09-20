export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";
import LLM, { type Msg } from "@/lib/llm";

const MODEL_NAME = process.env.LLM_MODEL_ID || "llama-3.1-70b";

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { threadId = "" } = (await req.json().catch(() => ({}))) as { threadId?: string };
    if (!threadId) {
      return NextResponse.json({ ok: false, error: "threadId required" }, { status: 400 });
    }

    const snapshot = await loadSnapshot(userId);
    if (!snapshot) {
      throw new Error("No patient data available to compute risk summary.");
    }

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

async function loadSnapshot(userId: string): Promise<Snapshot | null> {
  const supa = supabaseAdmin();
  const [{ data: profileRow, error: profileErr }, { data: obsRows, error: obsErr }] = await Promise.all([
    supa
      .from("profiles")
      .select("full_name,dob,sex,blood_group,conditions_predisposition,chronic_conditions")
      .eq("id", userId)
      .maybeSingle(),
    supa
      .from("observations")
      .select("kind,name,value_num,value_text,unit,meta,details,observed_at,created_at")
      .eq("user_id", userId)
      .order("observed_at", { ascending: false })
      .limit(120),
  ]);

  if (profileErr) throw new Error(profileErr.message);
  if (obsErr) throw new Error(obsErr.message);

  if (!profileRow && !obsRows?.length) return null;

  const profile = normalizeProfile(profileRow || {});
  const observations = buildObservationLines(obsRows || []);
  const highlights = buildHighlights(obsRows || []);

  return { profile, observations, highlights };
}

function normalizeProfile(row: any): PatientProfile {
  const chronic = toArray(row?.chronic_conditions);
  const predis = toArray(row?.conditions_predisposition);
  const dob = typeof row?.dob === "string" ? row.dob : null;
  const age = dob ? calcAge(dob) : null;
  return {
    name: typeof row?.full_name === "string" ? row.full_name : null,
    dob,
    age,
    sex: typeof row?.sex === "string" ? row.sex : null,
    blood_group: typeof row?.blood_group === "string" ? row.blood_group : null,
    chronic_conditions: chronic,
    conditions_predisposition: predis,
  };
}

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return value.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
    }
  }
  return [];
}

function calcAge(dob: string): number | null {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.max(0, Math.floor(diff / (365.25 * 24 * 3600 * 1000)));
}

type RawObservation = {
  kind?: string | null;
  name?: string | null;
  value_num?: number | null;
  value_text?: string | null;
  unit?: string | null;
  meta?: any;
  details?: any;
  observed_at?: string | null;
  created_at?: string | null;
};

function buildObservationLines(rows: RawObservation[]): ObservationLine[] {
  const sorted = [...rows].sort((a, b) =>
    new Date(b?.observed_at || b?.created_at || 0).getTime() -
    new Date(a?.observed_at || a?.created_at || 0).getTime()
  );

  const MAX = 60;
  const lines: ObservationLine[] = [];
  for (const row of sorted) {
    if (lines.length >= MAX) break;
    const label = labelFor(row);
    const value = valueFor(row);
    const observedAt = row?.observed_at || row?.created_at || new Date().toISOString();
    const category = inferCategory(row);
    if (!label || !value) continue;
    lines.push({ label, value, observedAt, category });
  }
  return lines;
}

function labelFor(row: RawObservation): string | null {
  const meta = row?.meta || row?.details || {};
  return (
    row?.name ||
    row?.kind ||
    meta?.label ||
    meta?.name ||
    meta?.analyte ||
    meta?.test_name ||
    meta?.title ||
    null
  );
}

function valueFor(row: RawObservation): string | null {
  const meta = row?.meta || row?.details || {};
  const raw =
    row?.value_num ??
    row?.value_text ??
    meta?.value_num ??
    meta?.value ??
    meta?.summary ??
    meta?.text ??
    null;
  const unit = row?.unit || meta?.unit || "";
  if (raw == null) return null;
  if (typeof raw === "number") return `${raw}${unit ? ` ${unit}` : ""}`;
  const txt = String(raw).trim();
  return txt ? `${txt}${unit ? ` ${unit}` : ""}` : null;
}

function inferCategory(row: RawObservation): string {
  const meta = row?.meta || row?.details || {};
  const cat = typeof meta?.category === "string" ? meta.category.toLowerCase() : "";
  if (cat) return cat;
  const kind = `${row?.kind || ""}`.toLowerCase();
  if (/(lab|glucose|chol|hba1c|egfr|bilirubin|ldl|hdl|vitamin)/.test(kind)) return "lab";
  if (/(note|symptom|complaint)/.test(kind)) return "note";
  if (/(med|rx|drug|tablet|capsule)/.test(kind)) return "medication";
  if (/(imaging|ct|mri|xray|ultrasound|echo)/.test(kind)) return "imaging";
  return cat || "observation";
}

function buildHighlights(rows: RawObservation[]): string[] {
  const pick = (rx: RegExp) =>
    [...rows]
      .filter(r => {
        const text = `${r?.kind || ""} ${r?.name || ""} ${JSON.stringify(r?.meta || {})}`.toLowerCase();
        return rx.test(text);
      })
      .sort((a, b) =>
        new Date(b?.observed_at || b?.created_at || 0).getTime() -
        new Date(a?.observed_at || a?.created_at || 0).getTime()
      )[0];

  const line = (label: string, row: RawObservation | undefined) => {
    if (!row) return null;
    const val = valueFor(row);
    if (!val) return null;
    const when = row?.observed_at || row?.created_at || "";
    const date = when ? new Date(when).toISOString().slice(0, 10) : "";
    return `${label}: ${val}${date ? ` (${date})` : ""}`;
  };

  const highlights = [
    line("HbA1c", pick(/\bhba1c\b/)),
    line("Fasting glucose", pick(/fasting|fpg|fbs|glucose/)),
    line("LDL", pick(/\bldl\b/)),
    line("eGFR", pick(/\begfr\b/)),
    line("Vitamin D", pick(/vitamin\s*d/)),
  ].filter(Boolean) as string[];

  return highlights.slice(0, 5);
}

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
