export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";
import { AIDOC_SYSTEM } from "@/lib/aidoc/policy";
import { classifyIntent } from "@/lib/aidoc/intents";
import { matchRedFlags } from "@/lib/aidoc/triage";
import { detectSymptomKey, SUGGESTED_TESTS, SELF_CARE_EDU } from "@/lib/aidoc/checks";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// Optional LLM (kept behind env; otherwise template text)
const useLLM = !!process.env.OPENAI_API_KEY;

async function llmReply(user: string, system: string, profileSummary: string, text: string) {
  if (!useLLM) return null;
  try {
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: system },
      {
        role: "user",
        content: `Profile summary:\n${profileSummary}\n\nUser (${user}): ${text}`,
      },
    ];
    const r = await openai.chat.completions.create({
      model: process.env.OPENAI_TEXT_MODEL || "gpt-5",
      temperature: 0.2,
      messages,
    });
    return r.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const { text } = await req.json().catch(() => ({}));
  const userId = await getUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const sb = supabaseAdmin();

  // fetch profile name + summary
  const [{ data: prof }, sumRes, obsRes] = await Promise.all([
    sb.from("profiles").select("full_name, conditions_predisposition, chronic_conditions").eq("id", userId).maybeSingle(),
    fetch(new URL("/api/profile/summary", req.url)).then(r => r.json()).catch(() => ({})),
    sb.from("observations").select("*").eq("user_id", userId),
  ]);

  const name = (prof?.full_name || "there").toString().trim();
  const summaryText = sumRes?.summary?.text || sumRes?.summary || sumRes?.text || "";

  const observations = (obsRes.data || []) as any[];
  const lastSymptom = observations
    .filter(o => (o.kind || "").toLowerCase() === "symptom")
    .sort((a, b) => new Date(b.observed_at || b.created_at).getTime() - new Date(a.observed_at || a.created_at).getTime())[0];

  const intent = classifyIntent(String(text || ""));
  const redFlags = matchRedFlags(String(text || ""));

  // Research handoff
  if (intent === "research") {
    return NextResponse.json({
      messages: [{
        role: "assistant",
        content:
          `I can help you research that in **Research Mode** so we can pull the latest sources. Click **Open Research Mode** below.\n\n` +
          `This is educational info, not a medical diagnosis. Please consult a clinician.`,
      }],
      handoff: { mode: "research" },
    });
  }

  // Danger: user asks "do I have cancer?" etc.
  if (intent === "danger" || redFlags.length) {
    const red = redFlags.length ? `\n⚠️ Red flags noted: ${redFlags.join(", ")}.` : "";
    return NextResponse.json({
      messages: [{
        role: "assistant",
        content:
          `I can’t diagnose conditions like cancer here.${red}\n` +
          `Based on your concern, consider speaking to a relevant specialist (e.g., oncologist) and bringing prior reports.\n` +
          `If symptoms are severe or rapidly worsening, seek urgent care immediately.\n\n` +
          `This is educational info, not a medical diagnosis. Please consult a clinician.`,
      }],
    });
  }

  // Greeting on boot (empty text) → includes summary
  if (intent === "greet" && !String(text || "").trim()) {
    const lastLine = lastSymptom?.value_text
      ? `Last time you mentioned **${lastSymptom.value_text}**—how are you feeling now?`
      : `How are you feeling today?`;
    return NextResponse.json({
      messages: [{
        role: "assistant",
        content:
          `${summaryText ? `Here’s a quick summary I have:\n${summaryText}\n\n` : ""}` +
          `Hi ${name}, I’m here to help. ${lastLine}\n\n` +
          `This is educational info, not a medical diagnosis. Please consult a clinician.`,
      }],
    });
  }

  // User explicitly asks for summary (no boot)
  if (intent === "summary_request") {
    return NextResponse.json({
      messages: [{
        role: "assistant",
        content:
          `${summaryText ? `Here’s a quick summary I have:\n${summaryText}` : "I don’t have enough info to summarize yet."}\n\n` +
          `This is educational info, not a medical diagnosis. Please consult a clinician.`,
      }],
    });
  }

  // Symptom handling (+ save continuity)
  if (intent === "symptom") {
    const key = detectSymptomKey(text);
    const selfCare = key ? SELF_CARE_EDU[key] : null;
    const tests = key ? SUGGESTED_TESTS[key] : [];
    // save symptom observation for continuity
    await sb
      .from("observations")
      .insert({
        user_id: userId,
        kind: "symptom",
        value_text: text,
        observed_at: new Date().toISOString(),
        meta: { source: "aidoc" },
      })
      .select()
      .maybeSingle();

    const template =
      `Thanks for sharing, ${name}. Let me ask a couple of quick things to understand better.\n` +
      `• Any severe/alarming features (very high fever, chest pain, difficulty breathing, confusion)?\n` +
      (selfCare ? `\nWhat people often do: ${selfCare}\n` : ``) +
      (tests.length ? `\nIf it persists/worsens, consider discussing these with a clinician: ${tests.join(", ")}.\n` : ``) +
      `\nIf symptoms escalate or you’re worried, please seek care.\n\n` +
      `This is educational info, not a medical diagnosis. Please consult a clinician.`;

    // Optional LLM flavor (keeps wording warm)
    const llm = await llmReply(name, AIDOC_SYSTEM, summaryText, text);
    return NextResponse.json({
      messages: [{
        role: "assistant",
        content: llm
          ? `${llm}\n\nThis is educational info, not a medical diagnosis. Please consult a clinician.`
          : template,
      }],
    });
  }

  // Medication request (educational)
  if (intent === "medication_request") {
    const content =
      `I can’t prescribe, but I can share general information.\n` +
      `For common symptoms, people sometimes consider OTC options **as per label dosing** if appropriate and if no allergies or interactions.\n` +
      `Because individual risks differ, please speak with a clinician before starting or changing medicines.\n\n` +
      `This is educational info, not a medical diagnosis. Please consult a clinician.`;
    return NextResponse.json({ messages: [{ role: "assistant", content }] });
  }

  // General small talk / fallback — NO summary repeat
  const fallback =
    `How can I help today, ${name}? You can describe symptoms, ask about general care, or switch to **Research Mode** for literature.\n\n` +
    `This is educational info, not a medical diagnosis. Please consult a clinician.`;
  return NextResponse.json({ messages: [{ role: "assistant", content: fallback }] });
}
