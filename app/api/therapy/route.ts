import { NextRequest, NextResponse } from "next/server";
export const runtime = "edge";

const OAI_KEY = process.env.OPENAI_API_KEY!;
const OAI_URL = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(new RegExp('/+$'), "");
const MODEL   = process.env.OPENAI_TEXT_MODEL || "gpt-5";
const ENABLED = String(process.env.THERAPY_MODE_ENABLED||"").toLowerCase()==="true";

const SYSTEM = `
You are a supportive CBT-style coach. 
Do not diagnose or prescribe. Encourage professional help for ongoing concerns. 
If self-harm risk appears, advise contacting emergency services immediately.
`;

function crisisCheck(t: string){
  if(!t) return false;
  return /\b(suicide|kill myself|end my life|no reason to live|hurt myself|hurt someone)\b/i.test(t);
}

export async function POST(req: NextRequest) {
  if (!ENABLED) return NextResponse.json({ error: "Therapy mode disabled" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  if (body?.wantStarter) {
    return NextResponse.json({ starter: "Hi, I’m here with you. What would you like to talk about?" });
  }

  const valid = new Set(["user", "assistant", "system"]);
  const clean = (Array.isArray(body?.messages) ? body.messages : [])
    .map((m: any) => ({
      role: valid.has(m?.role) ? m.role : "user",
      content:
        typeof m?.content === "string"
          ? m.content
          : m?.text ?? m?.message ?? "",
    }))
    .filter((m: any) => typeof m.content === "string" && m.content.trim() !== "")
    .map((m: any) => ({ role: m.role, content: m.content.trim() }));

  if (clean.length === 0)
    return NextResponse.json({ error: "No valid messages" }, { status: 400 });

  const userText = clean.map((m: any) => m.content).join("\n").slice(-2000);
  const crisis = crisisCheck(userText);

  const sys = [{ role: "system", content: SYSTEM }];

  let r = await fetch(`${OAI_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OAI_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [...sys, ...clean],
      temperature: 0.7,
      max_tokens: 512,
    }),
  });

  if (!r.ok) {
    const lastUser = [...clean].reverse().find((m) => m.role === "user") || clean[clean.length - 1];
    const r2 = await fetch(`${OAI_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OAI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [...sys, { role: "user", content: lastUser.content }],
        temperature: 0.7,
        max_tokens: 512,
      }),
    });
    if (!r2.ok)
      return NextResponse.json(
        { error: `OpenAI ${r2.status}`, detail: await r2.text() },
        { status: r2.status }
      );
    r = r2;
  }

  const data = await r.json();
  return NextResponse.json({ ok: true, completion: data?.choices?.[0]?.message?.content || "", crisis });
}

