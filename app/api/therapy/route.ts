import { NextRequest, NextResponse } from "next/server";
export const runtime = "edge";

const OAI_KEY = process.env.OPENAI_API_KEY!;
const OAI_URL = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
const MODEL   = process.env.OPENAI_TEXT_MODEL || "gpt-5";
const ENABLED = String(process.env.THERAPY_MODE_ENABLED || "").toLowerCase() === "true";

const STYLE = `One short reflection (≤1 line) of the user’s last message.
Then ask exactly one clear question; end with a single “?”.
Progress gradually through stages S0…S8:
S0 Intro/Name → S1 Concern → S2 Today’s Goal → S3 Context/Pattern →
S4 Thoughts/Feelings → S5 Coping/Supports → S6 24-hr Micro-Plan →
S7 Safety (if needed) → S8 Close/next check-in.
Maintain an internal formulation: situation → thought → emotion → body → behavior; note maintainers, values, readiness.
Choose techniques minimally (CBT/MI/grounding). Offer micro-suggestions only if user is stuck.
If risk cues or heavy daily alcohol use: one-line safety note; ask consent to share help. No diagnosis/medication advice. This is supportive self-help, not medical care.
Be culturally sensitive, warm, concise.`;

const isGpt5 = MODEL.startsWith("gpt-5");
const maxParam = isGpt5 ? "max_completion_tokens" : "max_tokens";
let tokenLimit = 2048;

function crisisCheck(t: string) {
  return /\b(suicide|kill myself|end my life|no reason to live|hurt myself|hurt someone)\b/i.test(t || "");
}

function sanitizeMessages(raw: any[] = []) {
  const valid = new Set(["user", "assistant", "system"]);
  return raw
    .map((m: any) => ({
      role: valid.has(m?.role) ? m.role : "user",
      content: typeof m?.content === "string" ? m.content : (m?.text ?? m?.message ?? ""),
    }))
    .filter((m: any) => typeof m.content === "string" && m.content.trim() !== "")
    .map((m: any) => ({ role: m.role, content: m.content.trim() }));
}

function makePayload(messages: any[]) {
  const p: any = { model: MODEL, messages };
  if (!isGpt5) p.temperature = 0.7;
  p[maxParam] = tokenLimit;
  return p;
}

async function callOpenAI(messages: any[]) {
  const res = await fetch(`${OAI_URL}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${OAI_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(makePayload(messages)),
  });

  const raw = await res.text();
  let data: any = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { parseError: true, raw };
  }

  if (!res.ok) return { error: `OpenAI ${res.status}`, detail: raw.slice(0, 200) };

  const choice = data?.choices?.[0];
  return {
    text: choice?.message?.content || "",
    cutoff: choice?.finish_reason === "length",
  };
}

function nextQuestion(stage: string, name?: string) {
  switch (stage) {
    case "S0":
      return `Hi, I’m Mira, a supportive listener. May I know your name?`;
    case "S1":
      return `Nice to meet you${name ? `, ${name}` : ""}. What feels hardest right now?`;
    case "S2":
      return `For today, would you rather quit completely, cut down, or understand triggers?`;
    case "S3":
      return `When do urges hit most—time of day or situations?`;
    case "S4":
      return `What thoughts or feelings show up just before a drink?`;
    case "S5":
      return `What’s helped even a little—delay, calling someone, or swapping a drink?`;
    case "S6":
      return `Let’s pick one tiny step for the next 24 hours. Which feels doable right now?`;
    case "S7":
      return `Stopping suddenly can be risky for daily heavy use. Would you like safe-taper or medical support info?`;
    case "S8":
      return `Thanks for sharing today. Would a quick check-in later help?`;
    default:
      return `What feels most helpful to talk about right now?`;
  }
}

function advance(stage: string, userText: string, risk: boolean) {
  if (stage === "S0" && /[A-Z][a-z]+/.test(userText)) return "S1";
  if (stage === "S1") return "S2";
  if (stage === "S2") return "S3";
  if (stage === "S3") return "S4";
  if (stage === "S4") return "S5";
  if (stage === "S5") return "S6";
  if (risk) return "S7";
  if (stage === "S6") return "S8";
  return stage;
}

function extractDetails(text: string) {
  const maybeNameMatch = text.match(/\b([A-Z][a-z]{2,})\b/);
  const maybeName = maybeNameMatch ? maybeNameMatch[1] : undefined;

  const concernMatch = text.match(/\b(alcohol|drinking|drink|anxiety|stress|depression|drug|smoking)\b/i);
  const concern = concernMatch ? concernMatch[1].toLowerCase() : undefined;

  const goalMatch = text.match(/\b(quit|cut down|understand triggers)\b/i);
  const goalToday = goalMatch ? goalMatch[1].toLowerCase() : undefined;

  const triggerMatch = text.match(/\b(morning|evening|night|work|home|party|friends|weekend)\b/i);
  const triggers = triggerMatch ? triggerMatch[1].toLowerCase() : undefined;

  const feelingWordMatch = text.match(/\b(feel(?:ing)?|felt|am|I'm)\s+([a-z]+)/i);
  const feelingWord = feelingWordMatch ? feelingWordMatch[2].toLowerCase() : undefined;
  const intensityMatch = text.match(/(\d{1,2})\s*\/\s*10/);
  const feelingIntensity = intensityMatch ? parseInt(intensityMatch[1], 10) : undefined;
  const feelings = feelingWord ? `${feelingWord}${feelingIntensity !== undefined ? ` ${feelingIntensity}` : ""}` : undefined;

  const bodyMatch = text.match(/\b(shaky|sweat|tremble|headache|nausea|heart|stomach)\b/i);
  const body = bodyMatch ? bodyMatch[1].toLowerCase() : undefined;

  const copingMatch = text.match(/\b(delay|call|swap|walk|breath|breathe|meditate)\b/i);
  const coping = copingMatch ? copingMatch[1].toLowerCase() : undefined;

  const supportMatch = text.match(/\b(friend|family|mom|dad|sister|brother|partner|group)\b/i);
  const supports = supportMatch ? supportMatch[1].toLowerCase() : undefined;

  const heavyUse = /\b(drink|drinking|alcohol)\b.*\b(daily|every day|all day)\b/i.test(text);
  const selfHarm = crisisCheck(text);

  const riskFlags = { selfHarm, heavyUse };

  return { maybeName, concern, goalToday, triggers, feelings, body, coping, supports, riskFlags };
}

function updateSummary(prev: string, details: any, goal?: string) {
  const concern = details.concern || prev.match(/concern:([^;]+)/i)?.[1]?.trim();
  const goalToday = goal || details.goalToday || prev.match(/goal:([^;]+)/i)?.[1]?.trim();
  const trigger = details.triggers || prev.match(/trigger:([^;]+)/i)?.[1]?.trim();
  const parts: string[] = [];
  if (concern) parts.push(`concern: ${concern}`);
  if (goalToday) parts.push(`goal: ${goalToday}`);
  if (trigger) parts.push(`trigger: ${trigger}`);
  return parts.join("; ").slice(0, 200);
}

export async function POST(req: NextRequest) {
  try {
    if (!ENABLED) {
      return NextResponse.json({ error: "Therapy mode disabled" }, { status: 403 });
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    if (body?.wantStarter) {
      return NextResponse.json({
        starter: "Hi, I’m here with you. Want to tell me what’s on your mind today? 💙",
        disclaimer: process.env.THERAPY_DISCLAIMER || "",
        crisisBanner: process.env.CRISIS_BANNER_TEXT || "",
      });
    }

    const clean = sanitizeMessages(Array.isArray(body?.messages) ? body.messages : []);
    if (clean.length === 0) {
      return NextResponse.json({ error: "No valid messages" }, { status: 400 });
    }

    const lastUser = [...clean].reverse().find((m) => m.role === "user") || clean[clean.length - 1];
    const details = extractDetails(lastUser.content || "");
    const risk = details.riskFlags.selfHarm || details.riskFlags.heavyUse;

    const currentStage: string = body.stage || "S0";
    const nextStage = advance(currentStage, lastUser.content || "", risk);

    const knownName = body.name || details.maybeName;
    const summary = updateSummary(body.summary || "", details, body.goal_today);

    const style = { role: "system", content: STYLE };
    const director = {
      role: "system",
      content: `Current Stage: ${nextStage}\nName: ${knownName || "unknown"}\nSummary: ${summary || "n/a"}\nInstruction: Reflect the user’s last message in ≤1 line, then ask exactly ONE question that advances this stage. Avoid multiple questions. No buttons. End with "?".\nNext question suggestion: ${nextQuestion(nextStage, knownName)}`,
    };
    const messages = [style, director, ...clean];

    tokenLimit = 2048;
    let result = await callOpenAI(messages);
    if (result.cutoff || !result.text) {
      tokenLimit = 4096;
      result = await callOpenAI(messages);
    }
    if (!result.text) {
      result = await callOpenAI([style, director, { role: "user", content: lastUser.content }]);
    }
    if (!result.text) {
      return NextResponse.json({ error: result.error || "Empty response from OpenAI", detail: result.detail || "" }, { status: 500 });
    }

    const completion = result.text.trim().split(/\n+/).slice(0, 3).join("\n");

    const resp: any = { ok: true, completion, nextStage };
    if (!body.name && details.maybeName) resp.name = details.maybeName;
    if (summary) resp.summary = summary;

    return NextResponse.json(resp);
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", detail: String(e?.message || e) }, { status: 500 });
  }
}

