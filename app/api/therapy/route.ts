// app/api/therapy/route.ts  (resolved)

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { summarizeTherapyJSON, type ChatMessage as TM } from "@/lib/therapy/summarizer";
import { supabaseServer } from "@/lib/supabaseServer";
import { getServerUserId } from "@/lib/auth/serverUser";
import { extractTriggersFrom } from "@/lib/therapy/triggers";

export const runtime = "nodejs";

const OAI_KEY = process.env.OPENAI_API_KEY!;
const OAI_URL = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
const MODEL   = process.env.OPENAI_TEXT_MODEL || "gpt-5";
const ENABLED = String(process.env.THERAPY_MODE_ENABLED || "").toLowerCase() === "true";
const PROFILE_REBUILD_EVERY = Number(process.env.THERAPY_PROFILE_REBUILD_EVERY || 3);

const moodList = ["calm","hopeful","content","neutral","anxious","sad","angry","tired","overwhelmed","stressed"];

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

// ---------- helpers ----------
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
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = { parseError: true, raw }; }

  if (!res.ok) return { error: `OpenAI ${res.status}`, detail: raw.slice(0, 200) };

  const choice = data?.choices?.[0];
  return {
    text: choice?.message?.content || "",
    cutoff: choice?.finish_reason === "length",
  };
}

function nextQuestion(stage: string, name?: string, facets?: Record<string, any>) {
  const avoidant = facets?.conflict_avoidance === "high";
  const anxious  = facets?.anxiety_tone === "high";
  const assertive = facets?.assertiveness === "high";

  switch (stage) {
    case "S0":
      return avoidant
        ? `Hi${name ? `, ${name}` : ""}. We can go slowly—what would feel most comfortable to start with?`
        : `Hi, I’m Mira, a supportive listener. May I know your name?`;
    case "S1":
      return anxious
        ? `Thanks for sharing${name ? `, ${name}` : ""}. What feels hardest right now—just one small thing is ok.`
        : `Nice to meet you${name ? `, ${name}` : ""}. What feels hardest right now?`;
    case "S2":
      return avoidant
        ? `For today, we could pick a gentle focus—would understanding triggers feel okay?`
        : `For today, would you rather quit completely, cut down, or understand triggers?`;
    case "S5":
      return assertive
        ? `Which coping strategy would you commit to trying once this week?`
        : `What’s helped even a little—delay, calling someone, or swapping a drink?`;
    default:
      return anxious
        ? `What feels most helpful to talk about right now—one small thing is fine.`
        : `What feels most helpful to talk about right now?`;
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

// Fallback quick note if JSON summarizer fails
function synthFallbackNote(text: string) {
  const topics: string[] = [];
  if (/sleep|insomnia/i.test(text)) topics.push("sleep");
  if (/work|boss|office/i.test(text)) topics.push("work stress");
  if (/family|partner|relationship/i.test(text)) topics.push("relationships");

  const mood = /hopeful|optimistic/i.test(text) ? "hopeful"
            : /anxious|worried/i.test(text) ? "anxious"
            : /tired|exhausted/i.test(text) ? "tired"
            : undefined;

  return {
    summary: text.slice(0, 280),
    meta: { topics, triggers: [], emotions: [], goals: [] },
    mood,
    breakthrough: undefined as string | undefined,
    nextStep: undefined as string | undefined,
  };
}

function buildWrapupFromNote(note: any) {
  const summary = (note?.summary || "").trim();
  const step = (note?.nextStep || note?.meta?.goals?.[0] || "").trim();
  const line1 = summary
    ? `Quick recap: ${summary}`
    : `Quick recap: we focused on what matters to you today.`;
  const line2 = step
    ? `A tiny next step you could try: ${step}. We can check how it went next time.`
    : `If it helps, choose one tiny step to try before we talk again.`;
  return `${line1}\n${line2}`;
}

// ---------- handler ----------
export async function POST(req: NextRequest) {
  try {
    if (!ENABLED) {
      return NextResponse.json({ error: "Therapy mode disabled" }, { status: 403 });
    }

    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }

    // Belt & suspenders: this route is therapy-only
    if (body?.mode && body.mode !== "therapy") {
      return NextResponse.json({ error: "Wrong mode for /api/therapy" }, { status: 400 });
    }

    // Optional starter payload
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

    // fetch profile once per request (non-blocking if missing)
    let profile: any = null;
    try {
      const sb = supabaseServer();
      const { data } = await sb
        .from("therapy_profile")
        .select("personality, values, recent_goals")
        .eq("user_id", await getServerUserId(req))
        .maybeSingle();
      profile = data || null;
    } catch {}

    const style = { role: "system", content: STYLE };
    const facet = (k: string) => profile?.personality?.[k] || null;
    const valuesStr = profile?.values ? Object.keys(profile.values).filter(k => profile.values[k]).slice(0,3).join(", ") : "";
    const goalsHint = (profile?.recent_goals || []).slice(-1)[0];

    const adaptation = [
      facet("conflict_avoidance")==="high" ? "Use very gentle, non-confrontational phrasing." : null,
      facet("self_criticism")==="high" ? "Validate effort; highlight strengths to balance harsh self-judgment." : null,
      facet("anxiety_tone")==="high" ? "Keep questions short; avoid stacking; one topic at a time." : null,
      valuesStr ? `User values: ${valuesStr}. Align questions with these.` : null,
      goalsHint ? `They previously planned: ${goalsHint}. Optionally check progress briefly.` : null
    ].filter(Boolean).join(" ");

    const director = {
      role: "system",
      content:
`Current Stage: ${nextStage}
Name: ${knownName || "unknown"}
Summary: ${summary || "n/a"}
Adaptation: ${adaptation || "Keep tone warm and concise."}
Instruction: Reflect the user’s last message in ≤1 line, then ask exactly ONE question that advances this stage. Avoid multiple questions. End with "?". 
Next question suggestion: ${nextQuestion(nextStage, knownName, profile?.personality)}`
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

    // --------- save structured note (server-side) ----------
    let wrapup: string | null = null;
    try {
      const openai = new OpenAI({ apiKey: OAI_KEY, baseURL: OAI_URL });
      const recent: TM[] = [
        ...clean.map((m: any) => ({ role: m.role as TM["role"], content: String(m.content || "") })),
        { role: "assistant", content: completion }
      ];

      const userId = await getServerUserId(req);
      if (userId) {
        const note = (await summarizeTherapyJSON(openai, recent)) ?? null;
        let fallback: any = null;
        if (!note) fallback = synthFallbackNote(completion);
        const sb = supabaseServer();

        // Merge extra triggers from last user message for better recall
        const lastUserText = lastUser?.content || "";
        const extraTriggers = extractTriggersFrom(lastUserText);

        const mergedMeta = {
          topics: Array.from(new Set([...(note?.topics || []), ...(fallback?.meta?.topics || [])])).slice(0, 10),
          triggers: Array.from(new Set([...(note?.triggers || []), ...(fallback?.meta?.triggers || []), ...extraTriggers])).slice(0, 10),
          emotions: (note?.emotions || fallback?.meta?.emotions || []).slice(0, 10),
          goals: ((note as any)?.goals || fallback?.meta?.goals || [])
        };

        await sb.from("therapy_notes").insert({
          user_id: userId,
          summary: (note?.summary || fallback?.summary),
          meta: mergedMeta,
          mood: (note?.mood || fallback?.mood || "neutral"),
          breakthrough: note?.breakthrough ?? fallback?.breakthrough ?? null,
          next_step: note?.nextStep ?? fallback?.nextStep ?? null
        });
        const usedNote: any = note || fallback;

        try {
          const sb = supabaseServer();
          // Count total notes for this user (fast: index on user_id, created_at)
          const { count } = await sb
            .from("therapy_notes")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId);

          if (typeof count === "number" && count > 0 && PROFILE_REBUILD_EVERY > 0 && count % PROFILE_REBUILD_EVERY === 0) {
            // Fire-and-forget call to rebuild profile from recent notes
            fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/therapy/profile/rebuild?userId=${userId}&limit=50`, {
              method: "POST",
              headers: { "Content-Type": "application/json" }
            }).catch(() => {});
          }
        } catch { /* fail-soft */ }

        try {
          if (usedNote && (body?.wrapup === true || nextStage === "S8")) {
            wrapup = buildWrapupFromNote(usedNote);
          }
        } catch {}
      }
    } catch { /* fail-soft: never block user reply */ }

    const resp: any = { ok: true, completion, nextStage };
    if (!body.name && details.maybeName) resp.name = details.maybeName;
    if (summary) resp.summary = summary;
    if (wrapup) resp.wrapup = wrapup;

    return NextResponse.json(resp);
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", detail: String(e?.message || e) }, { status: 500 });
  }
}
