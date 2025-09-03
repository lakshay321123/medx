import { NextResponse } from "next/server";
export const runtime = "edge";

export async function GET() {
  const key = process.env.OPENAI_API_KEY;
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(new RegExp('/+$'), "");
  const model = process.env.OPENAI_TEXT_MODEL || "gpt-5";

  if (!key) return NextResponse.json({ ok: false, error: "Missing OPENAI_API_KEY" }, { status: 500 });

  const r = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "user", content: "Say OK" }], max_tokens: 5 })
  });

  return NextResponse.json({ status: r.status, body: await r.text() });
}
