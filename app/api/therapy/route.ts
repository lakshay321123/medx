import { NextRequest, NextResponse } from "next/server";
export const runtime = "edge";

const OAI_KEY = process.env.OPENAI_API_KEY!;
const OAI_URL = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
const MODEL   = process.env.OPENAI_TEXT_MODEL || "gpt-5";
const ENABLED = String(process.env.THERAPY_MODE_ENABLED||"").toLowerCase()==="true";

const SYSTEM = `You are a supportive CBT-style coach. Do not diagnose or prescribe. Keep it short, warm, practical.`;

const isGpt5 = MODEL.startsWith("gpt-5");
const maxParam = isGpt5 ? "max_completion_tokens" : "max_tokens";

function crisisCheck(t:string){
  return /\b(suicide|kill myself|end my life|no reason to live|hurt myself|hurt someone)\b/i.test(t||"");
}

function sanitizeMessages(raw:any[] = []) {
  const valid = new Set(["user","assistant","system"]);
  return raw
    .map((m:any)=>({
      role: valid.has(m?.role) ? m.role : "user",
      content: typeof m?.content === "string" ? m.content : (m?.text ?? m?.message ?? "")
    }))
    .filter((m:any)=> typeof m.content === "string" && m.content.trim() !== "")
    .map((m:any)=> ({ role: m.role, content: m.content.trim() }));
}

function makePayload(messages:any[]) {
  const p:any = { model: MODEL, messages };
  if (!isGpt5) p.temperature = 0.7;
  p[maxParam] = 512;
  return p;
}

async function callOpenAI(messages:any[]) {
  const r = await fetch(`${OAI_URL}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${OAI_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(makePayload(messages))
  });

  const raw = await r.text();
  let data: any = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = { parseError: true, raw }; }

  if (!r.ok) return { error: `OpenAI ${r.status}`, detail: raw.slice(0, 200) };
  return { text: data?.choices?.[0]?.message?.content || "" };
}

export async function POST(req: NextRequest) {
  try {
    if (!ENABLED) {
      return NextResponse.json({ error: "Therapy mode disabled" }, { status: 403 });
    }

    // If body is empty or invalid JSON, ensure we still respond with JSON
    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }

    if (body?.wantStarter) {
      return NextResponse.json({
        starter: "Hey, I’m here with you. Want to tell me what’s on your mind today? 💙",
        disclaimer: process.env.THERAPY_DISCLAIMER || "",
        crisisBanner: process.env.CRISIS_BANNER_TEXT || ""
      });
    }

    const clean = sanitizeMessages(Array.isArray(body?.messages) ? body.messages : []);
    if (clean.length === 0) {
      return NextResponse.json({ error: "No valid messages" }, { status: 400 });
    }

    const userText = clean.map(m=>m.content).join("\n").slice(-2000);
    const crisis = crisisCheck(userText);
    const sys = [{ role:"system", content: SYSTEM }];

    const first = await callOpenAI([...sys, ...clean]);
    let content = first.text;
    if (first.error || !content) {
      const lastUser = [...clean].reverse().find(m => m.role === "user") || clean[clean.length-1];
      const retry = await callOpenAI([...sys, { role:"user", content: lastUser.content }]);
      content = retry.text;
      if (retry.error || !content) {
        return NextResponse.json(
          { error: retry.error || first.error || "Empty response", detail: retry.detail || first.detail },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ ok: true, completion: content, crisis });
  } catch (e:any) {
    // Always return JSON, even on unexpected exceptions
    return NextResponse.json({ error: "Server error", detail: String(e?.message || e) }, { status: 500 });
  }
}

