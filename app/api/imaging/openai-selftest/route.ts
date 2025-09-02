import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  try {
    const key = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";
    if (!key) return NextResponse.json({ ok:false, error:"OPENAI_API_KEY missing" }, { status: 400 });

    // 1x tiny text-only prompt (no image) just to verify auth+model are valid
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: 'Reply with JSON: {"ping":"pong"} only.' }],
        temperature: 0
      })
    });

    const ok = r.ok;
    const data = await r.json();

    if (ok) {
      return NextResponse.json({
        ok,
        model,
        status: r.status,
        snippet: (data?.choices?.[0]?.message?.content || "").slice(0, 120),
      });
    }
    return NextResponse.json(
      { ok, model, status: r.status, rawError: data },
      { status: r.status }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
