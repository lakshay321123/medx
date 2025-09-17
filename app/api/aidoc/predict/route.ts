import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assembleBundle } from "@/lib/predict/assemble";
import { runOpenAI } from "@/lib/predict/openai";
import { formatWithLLM } from "@/lib/predict/llm";
import type { PredictionBundle } from "@/lib/predict/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    if (process.env.SECOND_OPINION_PREDICT !== "on") {
      return NextResponse.json({ ok: false, error: "disabled" }, { status: 503 });
    }

    const { threadId, bundle, dryRun } = await req.json() as {
      threadId?: string;
      bundle?: PredictionBundle;
      dryRun?: 0 | 1 | boolean;
    };
    if (!threadId) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });

    // Auth: derive user from session cookies (don’t trust client userId)
    const supabase = createClient();
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const userId = auth.user.id;

    // Prefer client-sent bundle (from already-loaded UI); fallback to server reads
    const resolved = bundle && hasAny(bundle)
      ? bundle
      : await assembleBundle({ userId });

    const counts = {
      profile: resolved?.profile ? 1 : 0,
      observations: resolved?.observations?.length || 0,
      labs: resolved?.labs?.length || 0,
      meds: resolved?.meds?.length || 0,
      chunks: resolved?.chunks?.length || 0
    };

    if (String(dryRun ?? process.env.SECOND_OPINION_DRYRUN) === "1") {
      return NextResponse.json({ ok: true, dryRun: true, counts });
    }

    if (Object.values(counts).every(n => n === 0)) {
      return NextResponse.json({ ok: false, error: "empty_bundle", counts }, { status: 200 });
    }

    // 1) OpenAI (primary): inspect, normalize, calculators → PredictionReport JSON
    const pr = await runOpenAI(resolved);

    // 2) Groq (LLM via LLM_*): concise final chat text (≤10 bullets)
    const text = await formatWithLLM(pr);

    // 3) Publish to current thread (non-disruptive, in-memory staging)
    (globalThis as any).__AIDOC_MESSAGES__ ||= new Map<string, any[]>();
    const arr = (globalThis as any).__AIDOC_MESSAGES__.get(threadId) || [];
    arr.push({ role: "assistant", content: text, ts: Date.now() });
    (globalThis as any).__AIDOC_MESSAGES__.set(threadId, arr);

    return NextResponse.json({ ok: true, counts });
  } catch (e: any) {
    console.error("[predict] error:", e?.message || e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

function hasAny(b?: PredictionBundle) {
  if (!b) return false;
  return Boolean(
    (b.profile) ||
    (b.observations && b.observations.length) ||
    (b.labs && b.labs.length) ||
    (b.meds && b.meds.length) ||
    (b.chunks && b.chunks.length)
  );
}
