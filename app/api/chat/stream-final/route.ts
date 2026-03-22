// ensureMinDelay removed — we want first byte ASAP for streaming
import { callOpenAIChat } from "@/lib/medx/providers";
import { languageDirectiveFor, SYSTEM_DEFAULT_LANG } from "@/lib/prompt/system";
import { BRAND_NAME } from "@/lib/brand";
import { checkRateLimit } from "@/lib/rateLimit";
import { MODE_STYLES } from "@/lib/prompts/modeStyles";
import { THERAPY_STYLE } from "@/lib/prompts/therapy";
import { buildProfileContext } from "@/lib/chat/profileContext";
import { runConditionRules } from "@/lib/chat/rulesRunner";
import { detectIntent, buildDataPullContext } from "@/lib/chat/intentRouter";
import { getMemory, formatMemoryForPrompt, saveMemory } from "@/lib/chat/memory";
import { getUserId } from "@/lib/getUserId";
import { saveThread, saveMessage } from "@/lib/chat/persistence";

// Research orchestrator (12 sources)
let orchestrateResearch: any;
try { ({ orchestrateResearch } = require("@/lib/research/orchestrator")); } catch {}
import { SUPPORTED_LANGS } from "@/lib/i18n/constants";
import { createLocaleEnforcedStream, enforceLocale } from "@/lib/i18n/enforce";
import { normalizeModeTag } from "@/lib/i18n/normalize";
import { buildFormatInstruction } from "@/lib/formats/build";
import { FORMATS } from "@/lib/formats/registry";
import { isValidLang, isValidMode } from "@/lib/formats/constants";
import { needsTableCoercion } from "@/lib/formats/tableGuard";
import { hasMarkdownTable, shapeToTable } from "@/lib/formats/tableShape";
import type { FormatId, Mode } from "@/lib/formats/types";

// Optional calculator prelude (safe if engine absent)
let composeCalcPrelude: any, extractAll: any, canonicalizeInputs: any, computeAll: any;
try {
  ({ composeCalcPrelude } = require("@/lib/medical/engine/prelude"));
  ({ extractAll, canonicalizeInputs } = require("@/lib/medical/engine/extract"));
  ({ computeAll } = require("@/lib/medical/engine/computeAll"));
} catch {}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeLangTag(tag?: string | null) {
  if (!tag) return 'en';
  const base = tag.toLowerCase().split('-')[0].replace(/[^a-z]/g, '');
  return (SUPPORTED_LANGS as readonly string[]).includes(base as any) ? base : 'en';
}

export async function POST(req: Request) {
  // Rate limiting
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { allowed, remaining } = checkRateLimit(clientIp);
  if (!allowed) {
    return new Response("Rate limit exceeded. Please wait a moment.", {
      status: 429,
      headers: { "Retry-After": "60", "X-RateLimit-Remaining": "0" },
    });
  }


  // --- Instant greeting replies (no LLM call needed) ---
  const lastMsg = messages?.[messages.length - 1];
  const lastText = (typeof lastMsg?.content === 'string' ? lastMsg.content : '').trim();
  const isGreeting = /^(h(i|ey|ello|ola|owdy)|yo|sup|good\s*(morning|afternoon|evening|night)|what'?s\s*up|namaste|gm)\s*[!?.]*$/i.test(lastText);
  
  if (isGreeting && lastText.length < 30) {
    const greetings = [
      "Hey! How can I help you with your health today?",
      "Hi there! What health question can I help you with?",
      "Hello! I'm here to help. What's on your mind?",
      "Hey! Ask me anything about health, wellness, or your medical profile.",
      "Hi! How would you like me to help you today?",
    ];
    const pick = greetings[Math.floor(Math.random() * greetings.length)];
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(pick));
        controller.close();
      }
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "X-Greeting": "1" },
    });
  }

  const t0 = Date.now();
  const payload = await req.json();
  const { messages = [], mode } = payload ?? {};
  const rawFormat = typeof payload?.formatId === 'string'
    ? payload.formatId.trim().toLowerCase()
    : '';
  const formatId = rawFormat && FORMATS.some(f => f.id === rawFormat)
    ? (rawFormat as FormatId)
    : undefined;
  const rawModeTag = payload?.modeTag ?? mode;
  const normalizedModeTag = normalizeModeTag(rawModeTag);
  const resolvedMode: Mode = isValidMode(normalizedModeTag) ? normalizedModeTag : 'wellness';
  if (process.env.NODE_ENV !== 'production' && !payload?.modeTag) {
    // eslint-disable-next-line no-console
    console.warn('[medx] Missing modeTag in request body; falling back to legacy mode:', mode);
  }
  const requestedLang = typeof payload?.lang === 'string' ? payload.lang : undefined;
  const headerLang = req.headers.get('x-user-lang') || req.headers.get('x-lang') || undefined;
  const langTag = (requestedLang && requestedLang.trim()) || (headerLang && headerLang.trim()) || SYSTEM_DEFAULT_LANG;
  const lang = normalizeLangTag(langTag);
  const langDirective = languageDirectiveFor(lang);
  const formatInstruction = isValidLang(lang)
    ? buildFormatInstruction(lang, resolvedMode, formatId)
    : '';

  const lastUserMessage =
    messages.slice().reverse().find((m: any) => m.role === "user")?.content || "";

  // This endpoint is explicitly the OpenAI (final say) stream for non-basic modes.
  // Keep your current /api/chat/stream for Groq/basic.
  // Evidence-based structured answer format
  const qualityRules = [
    `You are ${BRAND_NAME}, an evidence-based health assistant.`,
    '',
    'ANSWER STRUCTURE:',
    '1. What it is — Brief explanation (2-3 sentences)',
    '2. **What actually works** — Evidence-backed interventions with specifics',
    '3. **What does NOT work** — Common myths or ineffective approaches',
    '4. **When to see a doctor** — Red flags and professional guidance',
    '',
    'QUALITY RULES:',
    '- Reference well-known medical organizations (WHO, NIH, Mayo Clinic, NHS, ICMR) but do NOT invent URLs',
    '- Include specific numbers (dosages, durations, percentages) when evidence supports them',
    '- Mention if something is backed by strong evidence vs preliminary research',
    '- Use ## for main section headings and ### for sub-sections. Do NOT repeat the topic name in every heading.',
    '- Use bullet points under each heading for details.',
    '- End with a focused follow-up question that helps narrow down their situation',
    '',
    'NEVER:',
    '- Give generic advice without evidence backing',
    '- Invent or hallucinate citation URLs',
    '- Use filler phrases like "I hope this helps"',
  ].join('\n');

  let calcPrelude = '';
  if ((process.env.CALC_AI_DISABLE || "0") !== "1") {
    try {
      const extracted = extractAll?.(lastUserMessage);
      const canonical = canonicalizeInputs?.(extracted);
      const computed = computeAll?.(canonical);
      const prelude = composeCalcPrelude?.(computed);
      if (prelude) calcPrelude = `Use and verify these pre-computed values first:\n${prelude}`;
    } catch {}
  }

  // --- UNIFIED BRAIN: Connect ALL domain styles, profile, rules, memory, intent ---
  const isTherapy = resolvedMode === 'therapy';
  const userId = await getUserId();

  // 1. Mode-specific expert style (all 15 styles mapped to 6 modes)
  const modeStyle = MODE_STYLES[resolvedMode] || qualityRules;

  // 2. Profile context (patient demographics, vitals, meds, conditions)
  let profileBlock = '';
  let rulesBlock = '';
  let memoryBlock = '';
  let intentBlock = '';
  if (userId) {
    try {
      const [profileCtx, mem] = await Promise.all([
        buildProfileContext(userId),
        getMemory(userId),
      ]);
      profileBlock = profileCtx.text;
      memoryBlock = formatMemoryForPrompt(mem);

      // 3. Rules engine (fires for diabetes, HTN, lipids, thyroid, anemia)
      if (profileCtx.conditions.length || profileCtx.vitals.hba1c || profileCtx.vitals.hemoglobin) {
        rulesBlock = runConditionRules(profileCtx);
      }

      // 4. Intent detection (symptom triage, data pull, drug question, calculator)
      const lastUserMsg = messages?.[messages.length - 1]?.content || '';
      const intent = detectIntent(typeof lastUserMsg === 'string' ? lastUserMsg : '');
      if (intent === 'pull_data') {
        const { supabaseAdmin } = require("@/lib/supabase/admin");
        const { data: obs } = await supabaseAdmin()
          .from("observations").select("kind, value_num, value_text, unit, observed_at")
          .eq("user_id", userId).order("observed_at", { ascending: false }).limit(30);
        intentBlock = buildDataPullContext(obs || []);
      } else if (intent === 'symptom_triage') {
        // Run actual red flag checks from the triage engine
        let triageContext = '[TRIAGE MODE] The user is describing symptoms.\n';
        try {
          const { redflagChecks } = require('@/lib/aidoc/rules/redflags');
          const lastMsg = messages?.[messages.length - 1]?.content || '';
          const text = typeof lastMsg === 'string' ? lastMsg : '';
          const vitalsForCheck = {
            sbp: profileCtx?.vitals?.bp_systolic,
            hr: profileCtx?.vitals?.heart_rate,
            spo2: profileCtx?.vitals?.spo2,
          };
          const alerts = redflagChecks({ vitals: vitalsForCheck, symptomsText: text });
          if (alerts.length) {
            triageContext += '⚠️ RED FLAGS DETECTED:\n' + alerts.map((a: string) => `- ${a}`).join('\n') + '\nAddress these FIRST before any other response.\n';
          }
        } catch {}
        triageContext += 'Follow structured triage: (1) Address any red flags IMMEDIATELY, (2) Ask ONE focused follow-up about onset/duration/severity, (3) Only assess after gathering history.';
        intentBlock = triageContext;
      }
      
      // Wire research orchestrator for research modes (12 sources instead of basic Google CSE)
      if ((resolvedMode === 'wellness_research' || resolvedMode === 'clinical_research') && orchestrateResearch) {
        try {
          const lastMsg = messages?.[messages.length - 1]?.content || '';
          const query = typeof lastMsg === 'string' ? lastMsg : '';
          if (query.length > 5) {
            const packet = await orchestrateResearch(query, { mode: resolvedMode });
            if (packet?.citations?.length) {
              intentBlock += '\n[RESEARCH CITATIONS]\n' + packet.citations.slice(0, 5).map((c: any) => `- ${c.title} (${c.source}) ${c.url}`).join('\n');
            }
          }
        } catch (err) { console.warn('[stream-final] Research orchestrator failed:', err); }
      }

      if (intent === 'drug_question') {
        // Try to call drug interaction API if user has medications
        let drugContext = '[DRUG SAFETY MODE] The user is asking about drug interactions. Be cautious and thorough.';
        try {
          const meds = profileBlock.match(/Medications: (.+)/)?.[1]?.split(', ') || [];
          if (meds.length >= 2) {
            drugContext += `\nUser's current medications: ${meds.join(', ')}. Check for known interactions between these.`;
          }
        } catch {}
        intentBlock = drugContext;
      }
    } catch (err) {
      console.warn('[stream-final] Profile/rules/memory fetch failed:', err);
    }
  }

  // 5. Build final system prompt with ALL context layers
  const contextLayers = [profileBlock, memoryBlock, rulesBlock, intentBlock].filter(Boolean).join('\n\n');
  // Use mode-specific style as primary rules. qualityRules only as fallback.
  const baseRules = modeStyle || qualityRules;

  let system = isTherapy
    ? [langDirective, baseRules, contextLayers].filter(Boolean).join('\n\n')
    : [langDirective, formatInstruction, baseRules, calcPrelude, contextLayers].filter(Boolean).join('\n\n');

  const modelStart = Date.now();
  const upstream = await callOpenAIChat(
    [{ role: "system", content: system }, ...messages],
    { stream: true }
  );
  const modelMs = Date.now() - modelStart;

  const modeAllowed = Boolean(formatInstruction);
  const shouldCoerceToTable = modeAllowed && needsTableCoercion(formatId);

  if (shouldCoerceToTable) {
    const rawSse = await upstream.text();
    if (!upstream.ok) {
      return new Response(rawSse || 'OpenAI stream error', { status: upstream.status || 500 });
    }

    const fullText = rawSse
      .split(/\n\n/)
      .map(line => line.replace(/^data:\s*/, ''))
      .filter(Boolean)
      .filter(line => line !== '[DONE]')
      .map(chunk => {
        try {
          return JSON.parse(chunk)?.choices?.[0]?.delta?.content ?? '';
        } catch {
          return '';
        }
      })
      .join('');

    const subject = (lastUserMessage || '').split('\n')[0]?.trim() || 'Comparison';
    let table = shapeToTable(subject, fullText);
    table = enforceLocale(table, lang, { forbidEnglishHeadings: true });
    const payload = {
      choices: [{ delta: { content: table, medx_reset: true } }],
    };

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    const totalMs = Date.now() - t0;
    const appMs = Math.max(0, totalMs - modelMs);
    const headers = new Headers({
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Transfer-Encoding": "chunked",
      "Server-Timing": `app;dur=${appMs},model;dur=${modelMs}`,
      "x-medx-provider": "openai",
      "x-medx-model": process.env.OPENAI_TEXT_MODEL || "gpt-4o",
    });

    return new Response(stream, {
      status: 200,
      headers,
    });
  }

  if (!upstream?.ok || !upstream.body) {
    const err = upstream ? await upstream.text().catch(() => "Upstream error") : "Upstream error";
    return new Response(`OpenAI stream error: ${err}`, { status: 500 });
  }

  const formatFinalizer = shouldCoerceToTable
    ? (text: string) => {
        if (hasMarkdownTable(text)) return text;
        const subject = (lastUserMessage || '').split('\n')[0]?.trim() || 'Comparison';
        return shapeToTable(subject, text);
      }
    : undefined;

  const enforcedStream = createLocaleEnforcedStream(upstream.body, lang, {
    forbidEnglishHeadings: true,
    finalizer: formatFinalizer,
  });

  const totalMs = Date.now() - t0;
  const appMs = Math.max(0, totalMs - modelMs);
  const headers = new Headers({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "Transfer-Encoding": "chunked",
    "Server-Timing": `app;dur=${appMs},model;dur=${modelMs}`,
    "x-medx-provider": "openai",
    "x-medx-model": process.env.OPENAI_TEXT_MODEL || "gpt-4o",
  });

  return new Response(enforcedStream, {
    status: 200,
    headers,
  });
}
