// app/api/predictions/compute/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import LLM, { Msg } from "@/lib/LLM";

type Body = { threadId?: string };

function buildSnapshot(profile: any, observations: any[] = []) {
  const by = (code: string) => observations.find(
    o => (o?.code || "").toLowerCase() === code.toLowerCase()
  );
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

async function defaultUserId(sb: any) {
  const list = await sb.auth.admin.listUsers({ page: 1, perPage: 1 });
  const uid = list?.data?.users?.[0]?.id;
  if (!uid) throw new Error("No test user found in auth.");
  return uid;
}

async function getOrCreateAidocThread(sb: any, userId: string, preferredId?: string) {
  // If client passes a known threadId, try to use it
  if (preferredId) {
    const { data: has } = await sb.from("chat_threads")
      .select("id").eq("id", preferredId).eq("user_id", userId).limit(1).maybeSingle();
    if (has?.id) return has.id;
  }
  // Else ensure the single AiDoc thread exists
  const { data: found } = await sb.from("chat_threads")
    .select("id").eq("user_id", userId).eq("type", "aidoc").limit(1).maybeSingle();
  if (found?.id) return found.id;

  const { data: created, error } = await sb.from("chat_threads")
    .insert({ id: preferredId, user_id: userId, type: "aidoc", title: "AI Doc" })
    .select("id").single();
  if (error) throw error;
  return created.id;
}

export async function POST(req: NextRequest) {
  try {
    const sb = supabaseAdmin();
    const body = (await req.json().catch(() => ({} as Body))) as Body;
    const userId  = await defaultUserId(sb);
    const threadId = await getOrCreateAidocThread(sb, userId, body?.threadId || "med-profile");

    // Load profile + observations
    const [{ data: profile }, { data: obs }] = await Promise.all([
      sb.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      sb.from("observations").select("*").eq("user_id", userId)
        .order("observed_at", { ascending: false }).limit(500)
    ]);

    const snapshot = buildSnapshot(profile, obs || []);

    // A) Strict JSON validation/corrections → OpenAI GPT-5
    const verified = await LLM.validateJson(
      "You are a clinical QA engine. Validate and correct the structured health state. Return strict JSON (schema provided).",
      "Down-weight stale data (>90d). If conflicts exist, propose corrections in 'save'. Provide short and long observations.",
      JSON.stringify({ profile, snapshot }).slice(0, 180000)
    );

    // (optional) persist conservative corrections (labs only)
    if (Array.isArray(verified?.save?.labs)) {
      for (const l of verified.save.labs) {
        await sb.from("observations").insert({ user_id: userId, kind: "lab", ...l });
      }
    }

    // B) Final narrative → Groq (LLM)
    const summary = await LLM.finalize([
      { role: "system", content: "You are an expert clinical summarizer. Be concise, safe, and actionable." } as Msg,
      { role: "user", content:
        `OBS_SHORT:${verified?.observations?.short || ""}\n` +
        `OBS_LONG:${verified?.observations?.long || ""}\n` +
        `DOCTOR:${verified?.reply_doctor || ""}\n` +
        `PATIENT:${verified?.reply_patient || ""}`
      } as Msg
    ]);

    // Persist: predictions, timeline, chat message
    await sb.from("predictions").insert({ user_id: userId, summary, raw_verified: verified });
    await sb.from("timeline").insert({
      user_id: userId, kind: "ai", title: "AI health assessment updated",
      summary: verified?.observations?.short || "AI updated assessment",
      detail:  verified?.observations?.long  || summary
    });
    await sb.from("chat_messages").insert({
      thread_id: threadId, role: "assistant", content: summary, kind: "aidoc_summary"
    });

    return NextResponse.json({ ok: true, threadId });
  } catch (e: any) {
    console.error("[predictions/compute] ERROR:", e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
