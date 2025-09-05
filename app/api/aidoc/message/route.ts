export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";
import { classifyIntent } from "@/lib/aidoc/intents";
import { detectRedFlags, RED_FLAGS_MAP } from "@/lib/aidoc/triage";
import { detectSymptomKey, SELF_CARE_EDU, SUGGESTED_TESTS } from "@/lib/aidoc/checks";

interface StateRow {
  user_id: string;
  thread_id: string;
  symptom_key: string | null;
  symptom_text: string | null;
  step: string;
  updated_at?: string;
}

const DEFAULT_THREAD = 'med-profile';

export async function POST(req: NextRequest) {
  const { text, threadId } = await req.json().catch(() => ({}));
  const userId = await getUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  const sb = supabaseAdmin();
  const thread = String(threadId || DEFAULT_THREAD);

  const [{ data: prof }, sumRes, obsRes, stateRes] = await Promise.all([
    sb.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    fetch(new URL("/api/profile/summary", req.url)).then(r => r.json()).catch(() => ({})),
    sb.from("observations").select("*").eq("user_id", userId),
    sb
      .from("aidoc_conversation_state")
      .select("*")
      .eq("user_id", userId)
      .eq("thread_id", thread)
      .maybeSingle(),
  ]);

  const name = (prof?.full_name || "there").toString().trim();
  const summaryText = sumRes?.summary?.text || sumRes?.summary || sumRes?.text || "";
  const observations = (obsRes.data || []) as any[];
  const now = Date.now();
  const lastSymptom = observations
    .filter(o => (o.kind || "").toLowerCase() === "symptom")
    .filter(
      o => now - new Date(o.observed_at || o.created_at).getTime() < 30 * 24 * 60 * 60 * 1000
    )
    .sort(
      (a, b) =>
        new Date(b.observed_at || b.created_at).getTime() -
        new Date(a.observed_at || a.created_at).getTime()
    )[0];

  let state: StateRow =
    stateRes.data || ({ user_id: userId, thread_id: thread, symptom_key: null, symptom_text: null, step: 'idle' } as StateRow);

  const upsertState = async (patch: Partial<StateRow>) => {
    state = { ...state, ...patch, updated_at: new Date().toISOString() };
    await sb.from('aidoc_conversation_state').upsert(state, { onConflict: 'user_id,thread_id' });
  };

  const saveObservationSymptom = async (symText: string) => {
    if (!symText) return;
    await sb.from('observations').insert({
      user_id: userId,
      kind: 'symptom',
      value_text: symText,
      observed_at: new Date().toISOString(),
      meta: { source: 'aidoc' }
    });
  };

  const saveObservationNote = async (note: string) => {
    await sb.from('observations').insert({
      user_id: userId,
      kind: 'note',
      value_text: note,
      observed_at: new Date().toISOString(),
      meta: { source: 'aidoc' }
    });
  };

  const intent = classifyIntent(String(text || ""));
  const safety = "\n\nThis is educational info, not a medical diagnosis. Please consult a clinician.";

  // Boot greeting
  if (intent === 'boot') {
    const lastLine = lastSymptom?.value_text
      ? `Last time you mentioned **${lastSymptom.value_text}**—how are you feeling now?`
      : `How are you feeling today?`;
    const content =
      `${summaryText ? `Here’s a quick summary I have:\n${summaryText}\n\n` : ""}` +
      `Hi ${name}, I’m here to help. ${lastLine}${safety}`;
    return NextResponse.json({ messages: [{ role: 'assistant', content }] });
  }

  // Small casual greeting
  if (intent === 'small_greet') {
    const content = `Hi ${name}, how can I help today?${safety}`;
    return NextResponse.json({ messages: [{ role: 'assistant', content }] });
  }

  // Summary on demand
  if (intent === 'summary_request') {
    const content =
      `${summaryText ? `Here’s a quick summary I have:\n${summaryText}` : "I don’t have enough info to summarize yet."}${safety}`;
    return NextResponse.json({ messages: [{ role: 'assistant', content }] });
  }

  // Research handoff
  if (intent === 'research') {
    return NextResponse.json({
      messages: [
        {
          role: 'assistant',
          content:
            `I can help you research that in **Research Mode** so we can pull the latest sources. Click **Open Research Mode** below.${safety}`,
        },
      ],
      handoff: { mode: 'research' },
    });
  }

  // Danger / serious condition questions
  if (intent === 'danger') {
    const content =
      `I can’t diagnose conditions like that here.\nConsider speaking to a relevant specialist and bringing prior reports.\nIf symptoms are severe or rapidly worsening, seek urgent care immediately.${safety}`;
    return NextResponse.json({ messages: [{ role: 'assistant', content }] });
  }

  // Medication request
  if (intent === 'medication_request') {
    const content =
      `I can’t prescribe, but I can share general information.\nFor common symptoms, people sometimes consider OTC options **as per label dosing** if appropriate and if no allergies or interactions.\nBecause individual risks differ, please speak with a clinician before starting or changing medicines.${safety}`;
    return NextResponse.json({ messages: [{ role: 'assistant', content }] });
  }

  // Stateful symptom flow
  if (state.step === 'awaiting_red_flags') {
    const key = state.symptom_key || detectSymptomKey(state.symptom_text || '') || 'back_pain';
    const redMentioned = detectRedFlags(key, String(text || ''));
    const saidNo = /^\s*(no|nope|nah|none|nothing|not really)\b/i.test(String(text));
    if (redMentioned.length && !saidNo) {
      await upsertState({ step: 'resolved' });
      const content =
        `Those symptoms with ${key.replace('_', ' ')} could be serious. Please seek urgent medical care or emergency services.${safety}`;
      return NextResponse.json({ messages: [{ role: 'assistant', content }] });
    }
    await saveObservationSymptom(state.symptom_text || '');
    await saveObservationNote(`Self-care and tests discussed for ${key}`);
    await upsertState({ step: 'resolved' });
    const selfCare = SELF_CARE_EDU[key];
    const tests = SUGGESTED_TESTS[key] || [];
    const content =
      `Thanks for the update, ${name}.` +
      `${selfCare ? `\n${selfCare}` : ''}` +
      `${tests.length ? `\nTests to discuss with a clinician: ${tests.join(', ')}.` : ''}` +
      `\nSee a clinician if symptoms persist, worsen, or any red flags appear.${safety}`;
    return NextResponse.json({ messages: [{ role: 'assistant', content }] });
  }

  if (intent === 'symptom') {
    const key = detectSymptomKey(String(text || '')) || 'back_pain';
    await upsertState({ step: 'awaiting_red_flags', symptom_key: key, symptom_text: text });
    const list = RED_FLAGS_MAP[key] || [];
    const content =
      `Thanks for sharing, ${name}. Before I suggest next steps—any of these: ${list.join(', ')}?${safety}`;
    return NextResponse.json({ messages: [{ role: 'assistant', content }] });
  }

  if (state.step === 'resolved') {
    await upsertState({ step: 'idle', symptom_key: null, symptom_text: null });
    const content =
      `How can I help today, ${name}? You can describe symptoms, ask about general care, or switch to **Research Mode** for literature.${safety}`;
    return NextResponse.json({ messages: [{ role: 'assistant', content }] });
  }

  // General fallback
  const fallback =
    `How can I help today, ${name}? You can describe symptoms, ask about general care, or switch to **Research Mode** for literature.${safety}`;
  return NextResponse.json({ messages: [{ role: 'assistant', content: fallback }] });
}
