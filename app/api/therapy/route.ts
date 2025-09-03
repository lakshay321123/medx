import { NextRequest, NextResponse } from "next/server";
export const runtime = "edge";

const OAI_KEY = process.env.OPENAI_API_KEY!;
const OAI_URL = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
const MODEL   = process.env.OPENAI_TEXT_MODEL || "gpt-5";
const ENABLED = String(process.env.THERAPY_MODE_ENABLED||"").toLowerCase()==="true";

const SYSTEM = `You are a supportive CBT-style coach. Do not diagnose or prescribe. Keep it short, warm, practical.`;

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

async function openaiChat(messages:any[]) {
  const maxParam = MODEL.startsWith("gpt-5") ? "max_completion_tokens" : "max_tokens";
  const payload: any = { model: MODEL, messages, temperature: 0.7 };
  payload[maxParam] = 512;
  const r = await fetch(`${OAI_URL}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${OAI_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return r;
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

    let r = await openaiChat([...sys, ...clean]);

    // Retry once with minimal last-turn if OpenAI rejects the thread
    if (!r.ok) {
      const lastUser = [...clean].reverse().find(m => m.role === "user") || clean[clean.length-1];
      r = await openaiChat([...sys, { role:"user", content: lastUser.content }]);
      if (!r.ok) {
        const detail = await r.text().catch(()=> "");
        return NextResponse.json({ error: `OpenAI ${r.status}`, detail }, { status: r.status });
      }
    }

    const txt = await r.text(); // protect against malformed body
    let data: any = {};
    try { data = txt ? JSON.parse(txt) : {}; } catch { data = { parseError: true, raw: txt }; }

    const content = data?.choices?.[0]?.message?.content || "";
    return NextResponse.json({ ok: true, completion: content, crisis });
  } catch (e:any) {
    // Always return JSON, even on unexpected exceptions
    return NextResponse.json({ error: "Server error", detail: String(e?.message || e) }, { status: 500 });
  }
}

