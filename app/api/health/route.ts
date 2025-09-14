export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { defaultPlan, nextPlanFromChip } from "@/lib/answerPlanner";
import { buildHealthPrompt } from "@/lib/prompts";
import { callLLM } from "@/lib/llm";

export async function GET() {
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("profiles").select("id").limit(1);
    return NextResponse.json({
      ok: !error,
      env: {
        url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        anon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        service: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
      dbPing: error ? error.message : "ok",
      sample: data?.length || 0,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { message, chip, topic = "back pain", previousPlan } = await req.json();

  const plan = chip
    ? nextPlanFromChip(topic, chip, previousPlan ?? undefined)
    : defaultPlan(topic);

  const prompt = buildHealthPrompt(plan, message);

  const answer = await callLLM({
    prompt,
    temperature: 0.4,
    max_tokens: 450,
  });

  return NextResponse.json({ answer, plan });
}
