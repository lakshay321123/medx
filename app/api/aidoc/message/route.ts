export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";
import { nextTurn } from "@/lib/aidoc/orchestrator";
import { classifyIntent } from "@/lib/aidoc/intents";
import { safety } from "@/lib/aidoc/style";
import { listFrames } from "@/lib/aidoc/frames";

const safeFirst = (full?: string) => (full||"there").split(/\s+/)[0];

export async function POST(req: NextRequest) {
  const { text, client_state, thread_id } = await req.json().catch(()=>({}));
  const userId = await getUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const sb = supabaseAdmin();
  const [{ data: prof }, sumRes] = await Promise.all([
    sb.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    fetch(new URL("/api/profile/summary", req.url)).then(r=>r.json()).catch(()=>({}))
  ]);
  const name = safeFirst(prof?.full_name);
  const summaryText = sumRes?.summary?.text || sumRes?.summary || sumRes?.text || "";

  const state = {
    step: client_state?.step || "idle",
    frame_key: client_state?.frame_key || null,
    symptom_text: client_state?.symptom_text || null,
    flags_prompt_count: client_state?.flags_prompt_count || 0,
    followup_stage: client_state?.followup_stage || 0,
    collected: client_state?.collected || {}
  };

  const intent = classifyIntent(String(text || ""));

  // Research handoff
  if (intent === 'research') {
    return NextResponse.json({
      messages:[{ role:"assistant", content:`I can help you research that in **Research Mode** so we can pull the latest sources. Click **Open Research Mode** below.\n\n${safety}` }],
      handoff:{ mode:"research" },
      new_state: state
    });
  }

  if (intent === 'danger') {
    return NextResponse.json({
      messages:[{ role:"assistant", content:`I can’t diagnose conditions like that here. Based on your concern, consider speaking to a relevant specialist and bringing prior reports. If symptoms are severe or rapidly worsening, seek urgent care.\n\n${safety}` }],
      new_state: state
    });
  }

  if (intent === 'medication_request') {
    return NextResponse.json({
      messages:[{ role:"assistant", content:`I can’t prescribe, but I can share general information.\nFor common symptoms, people sometimes consider OTC options **as per label dosing** if appropriate and if no allergies or interactions.\nBecause individual risks differ, please speak with a clinician before starting or changing medicines.\n\n${safety}` }],
      new_state: state
    });
  }

  if (intent === 'summary_request') {
    return NextResponse.json({
      messages:[{ role:"assistant", content:`${summaryText ? `Here’s a quick summary I have:\n${summaryText}` : `I don’t have enough info to summarize yet.`}\n\n${safety}` }],
      new_state: state
    });
  }

  const lower = (text||"").toLowerCase();
  const heardMulti = listFrames()
    .filter(([key, frame]) => frame.synonyms.some(s => lower.includes(s.toLowerCase())))
    .map(([key]) => key.replace(/^_/, '').replace('_',' '));
  const isBoot = intent === 'greet' && !(text||"").trim();

  const turn = nextTurn(String(text||""), name, summaryText, state, { isBoot, heard: Array.from(new Set(heardMulti)) });

  // On plan, persist a symptom + note (best-effort, non-blocking)
  if (turn.newState?.step === 'resolved' && state.symptom_text) {
    sb.from("observations").insert({
      user_id: userId, kind: "symptom", value_text: state.symptom_text,
      observed_at: new Date().toISOString(), meta: { source:"aidoc", collected: state.collected||{} }
    }).then(() => null, () => null);
  }

  return NextResponse.json({
    messages: [{ role:"assistant", content: turn.msg }],
    new_state: turn.newState || state
  });
}

