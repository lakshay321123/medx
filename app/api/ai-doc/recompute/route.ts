import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import LLM from "@/lib/LLM";

export const runtime = "nodejs"; // ensure server runtime

type SupabaseClient = ReturnType<typeof supabaseAdmin>;

type Observation = {
  code?: string | null;
  value?: any;
  unit?: string | null;
  observed_at?: string | null;
};

type ProfileRow = {
  age?: number | null;
  sex?: string | null;
};

function buildSnapshot(profile: ProfileRow | null, observations: Observation[] = []) {
  const by = (code: string) =>
    observations.find(o => (o?.code || "").toLowerCase() === code.toLowerCase());
  const hb    = by("hb") || by("hemoglobin");
  const tsh   = by("tsh");
  const creat = by("creatinine");
  return {
    demographics: { age: profile?.age ?? null, sex: profile?.sex ?? null },
    labs: {
      hb:    hb    ? { value: hb.value, unit: hb.unit, ts: hb.observed_at } : undefined,
      tsh:   tsh   ? { value: tsh.value, unit: tsh.unit, ts: tsh.observed_at } : undefined,
      creat: creat ? { value: creat.value, unit: creat.unit, ts: creat.observed_at } : undefined
    }
  };
}

async function defaultUserId(sb: SupabaseClient) {
  const list = await sb.auth.admin.listUsers({ page: 1, perPage: 1 });
  const uid = list?.data?.users?.[0]?.id;
  if (!uid) throw new Error("No test user found in auth.");
  return uid;
}

async function getOrCreateAidocThread(sb: SupabaseClient, userId: string) {
  const found = await sb
    .from("chat_threads")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "aidoc")
    .limit(1)
    .maybeSingle();
  if (found.error && found.error.code !== "PGRST116") throw found.error;
  if (found.data?.id) return found.data.id as string;

  const created = await sb
    .from("chat_threads")
    .insert({ user_id: userId, type: "aidoc", title: "AI Doc" })
    .select("id")
    .single();
  if (created.error) throw created.error;
  return created.data?.id as string;
}

export async function runAidocRecompute() {
  const sb = supabaseAdmin();
  const userId = await defaultUserId(sb);
  const threadId = await getOrCreateAidocThread(sb, userId);

  const [profileRes, obsRes] = await Promise.all([
    sb.from("profiles").select("*").eq("id", userId).maybeSingle(),
    sb
      .from("observations")
      .select("*")
      .eq("user_id", userId)
      .order("observed_at", { ascending: false })
      .limit(500),
  ]);

  if (profileRes.error) throw profileRes.error;
  if (obsRes.error) throw obsRes.error;

  const profile = profileRes.data as ProfileRow | null;
  const observations = Array.isArray(obsRes.data) ? (obsRes.data as Observation[]) : [];
  const snapshot = buildSnapshot(profile, observations);

  // Step A: GPT-5 strict JSON validation/corrections
  const verified = await LLM.validateJson(
    "You are a clinical QA engine. Validate and correct the structured health state. Return strict JSON (schema provided).",
    "Down-weight stale data (>90d). If conflicts exist, propose corrections in 'save'. Provide short and long observations.",
    JSON.stringify({ profile, snapshot }).slice(0, 180000)
  );

  // (optional) persist conservative corrections (labs only)
  if (Array.isArray(verified?.save?.labs)) {
    for (const rawLab of verified.save.labs) {
      const lab: Record<string, any> = {
        user_id: userId,
        kind: "lab",
        ...rawLab,
      };
      if (!lab.observed_at) lab.observed_at = new Date().toISOString();
      const { error } = await sb.from("observations").insert(lab);
      if (error) throw error;
    }
  }

  // Step B: Groq final summary → post to existing Ai Doc chat
  const summary = await LLM.finalize([
    { role: "system", content: "You are an expert clinical summarizer. Be concise, safe, and actionable." },
    {
      role: "user",
      content:
        `OBS_SHORT:${verified?.observations?.short || ""}\n` +
        `OBS_LONG:${verified?.observations?.long || ""}\n` +
        `DOCTOR:${verified?.reply_doctor || ""}\n` +
        `PATIENT:${verified?.reply_patient || ""}`,
    },
  ]);

  const { error: predErr } = await sb.from("predictions").insert({
    user_id: userId,
    thread_id: threadId,
    summary,
    raw_verified: verified,
  });
  if (predErr) throw predErr;

  const { error: timelineErr } = await sb.from("timeline").insert({
    user_id: userId,
    kind: "ai",
    title: "AI health assessment updated",
    summary: verified?.observations?.short || "AI updated assessment",
    detail: verified?.observations?.long || summary,
  });
  if (timelineErr) throw timelineErr;

  const { error: chatErr } = await sb.from("chat_messages").insert({
    thread_id: threadId,
    role: "assistant",
    content: summary,
    kind: "aidoc_summary",
  });
  if (chatErr) throw chatErr;
}

export async function POST(_req: NextRequest) {
  try {
    await runAidocRecompute();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[aidoc-recompute] ERROR:", e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
