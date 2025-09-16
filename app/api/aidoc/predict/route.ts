import { NextResponse } from "next/server";
import { assembleBundle } from "@/lib/predict/assemble";
import { runOpenAI } from "@/lib/predict/openai";
import { formatWithLLM } from "@/lib/predict/llm";
import { createClient as createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    if (process.env.SECOND_OPINION_PREDICT !== "on") {
      return NextResponse.json({ ok: false, error: "disabled" }, { status: 503 });
    }
    const payload = await req
      .json()
      .catch(() => ({} as Record<string, unknown>));
    const { threadId, dryRun } = (payload ?? {}) as {
      threadId?: string;
      dryRun?: unknown;
    };
    if (!threadId || typeof threadId !== "string") {
      return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
    }

    const supabase = createServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const userId = user.id;

    const DRY = String(dryRun ?? process.env.SECOND_OPINION_DRYRUN) === "1";

    const bundle = await assembleBundle({ userId });

    if (DRY) {
      console.log("[PREDICT][DRYRUN]", {
        userId,
        threadId,
        counts: {
          obs: bundle.observations.length,
          labs: bundle.labs.length,
          meds: bundle.meds.length,
          chunks: bundle.chunks.length,
        },
      });
      return NextResponse.json({ ok: true, dryRun: true });
    }

    const pr = await runOpenAI(bundle);
    const text = await formatWithLLM(pr);

    (globalThis as any).__AIDOC_MESSAGES__ ||= new Map();
    const arr = (globalThis as any).__AIDOC_MESSAGES__.get(threadId) || [];
    arr.push({ role: "assistant", content: text, ts: Date.now() });
    (globalThis as any).__AIDOC_MESSAGES__.set(threadId, arr);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[PREDICT][ERROR]", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
