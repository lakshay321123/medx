export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/getUserId";
import { supabaseAdmin } from "@/lib/supabase/admin";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

type OutObs = {
  kind: string;
  value_num?: number | null;
  value_text?: string | null;
  unit?: string | null;
  observed_at?: string | null;
  meta?: Record<string, any> | null;
};

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { threadId, text, defaults, sourceHash } = await req.json().catch(() => ({}));
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const system = `You extract clinical observations from arbitrary medical documents.
Return JSON { "items": OutObs[] } (no commentary). Rules:
- "kind": short snake_case key (e.g., "hba1c","alt","mri_brain_report","rx_amoxicillin","diagnosis_diabetes").
- Numerical values -> value_num; textual -> value_text (keep BP "120/80" in value_text).
- category one of: lab|vital|imaging|medication|diagnosis|procedure|immunization|note|other.
- Include imaging findings, prescriptions, diagnoses, procedures, vaccines, vitals, and notes when present.
- Prefer explicit dates for observed_at if present; else null.`;

  const user = `Document text:\n"""${text.slice(0, 100000)}"""`;

  const resp = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
  });

  let items: OutObs[] = [];
  try {
    const parsed = JSON.parse(resp.choices[0]?.message?.content || "{}");
    items = Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    items = [];
  }

  if (!items.length) return NextResponse.json({ ok: true, inserted: 0, items: [] });

  const nowISO = new Date().toISOString();
  const sb = supabaseAdmin();

  // Idempotency: if a sourceHash is provided, clear prior rows for this user/thread/sourceHash first.
  if (sourceHash) {
    await sb
      .from("observations")
      .delete()
      .eq("user_id", userId)
      .eq("thread_id", threadId ?? null)
      .eq("meta->>source_hash", sourceHash);
  }

  const rows = items.map((x) => ({
    user_id: userId,
    thread_id: threadId ?? null,
    kind: String(x.kind || "unknown").toLowerCase(),
    value_num: x.value_num ?? null,
    value_text: x.value_text ?? null,
    unit: x.unit ?? null,
    observed_at: x.observed_at || defaults?.observed_at || nowISO,
    meta: {
      ...(x.meta || {}),
      ...(defaults?.meta || {}),
      source_type: x.meta?.source_type || defaults?.meta?.source_type || "text",
      ...(sourceHash ? { source_hash: sourceHash } : {}),
    },
  }));

  const { error, count } = await sb.from("observations").insert(rows, { count: "exact" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, inserted: count ?? rows.length });
}

