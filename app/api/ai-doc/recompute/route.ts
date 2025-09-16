import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import LLM from "@/lib/LLM";

// minimal snapshot helper (adjust codes if yours differ)
function buildSnapshot(profile: any, observations: any[] = []) {
  const by = (code: string) =>
    observations.find(o => (o.code||"").toLowerCase() === code.toLowerCase());
  const hb    = by("hb") || by("hemoglobin");
  const tsh   = by("tsh");
  const creat = by("creatinine");
  return {
    demographics: { age: profile?.age, sex: profile?.sex },
    labs: {
      hb:    hb    ? { value: hb.value, unit: hb.unit, ts: hb.observed_at } : undefined,
      tsh:   tsh   ? { value: tsh.value, unit: tsh.unit, ts: tsh.observed_at } : undefined,
      creat: creat ? { value: creat.value, unit: creat.unit, ts: creat.observed_at } : undefined
    }
  };
}

export async function POST(_req: NextRequest) {
  try {
    const sb = supabaseAdmin();

    // test phase: use first user as default
    const { data: users } = await sb.auth.admin.listUsers({ page:1, perPage:1 });
    const userId = users?.users?.[0]?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ ok:false, error:"No users available" }, { status: 400 });
    }

    // get existing Ai Doc thread (no new panel)
    const { data: thread } = await sb
      .from("chat_threads").select("id").eq("user_id", userId).eq("type","aidoc")
      .limit(1).maybeSingle();
    if (!thread?.id) {
      return NextResponse.json({ ok:false, error:"No AI Doc thread" }, { status: 400 });
    }

    // load data
    const [{ data: profile }, { data: obs }] = await Promise.all([
      sb.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      sb.from("observations").select("*").eq("user_id", userId).order("observed_at",{ascending:false}).limit(500)
    ]);

    const snapshot = buildSnapshot(profile, obs || []);

    // Step A: OpenAI GPT-5 strict JSON validation
    const verified = await LLM.validateJson(
      "You are a clinical QA engine. Validate and correct the structured health state. Return strict JSON (schema provided).",
      "Down-weight stale data (>90d). If conflicts exist, propose corrections in 'save'. Provide short and long observations.",
      JSON.stringify({ profile, snapshot }).slice(0, 180000)
    );

    // (optional) persist conservative corrections (labs example)
    if (Array.isArray(verified?.save?.labs)) {
      for (const l of verified.save.labs) {
        await sb.from("observations").insert({ user_id:userId, kind:"lab", ...l });
      }
    }

    // Step B: Groq final summary (post into EXISTING Ai Doc chat)
    const summary = await LLM.finalize([
      { role: "system", content: "You are an expert clinical summarizer. Be concise, safe, and actionable." },
      { role: "user", content:
        `OBS_SHORT:${verified?.observations?.short||""}\nOBS_LONG:${verified?.observations?.long||""}\nDOCTOR:${verified?.reply_doctor||""}\nPATIENT:${verified?.reply_patient||""}`
      }
    ]);

    // save prediction + timeline + chat message
    await sb.from("predictions").insert({ user_id:userId, summary, raw_verified: verified });
    await sb.from("timeline").insert({
      user_id:userId, kind:"ai", title:"AI health assessment updated",
      summary: verified?.observations?.short || "AI updated assessment",
      detail: verified?.observations?.long || summary
    });
    await sb.from("chat_messages").insert({
      thread_id: thread.id, role:"assistant", content: summary, kind:"aidoc_summary"
    });

    return NextResponse.json({ ok:true });
  } catch (e:any) {
    console.error("aidoc recompute error:", e);
    return NextResponse.json({ ok:false, error:String(e?.message||e) }, { status: 500 });
  }
}
