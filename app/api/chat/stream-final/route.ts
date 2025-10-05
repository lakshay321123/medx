import { ensureMinDelay, minDelayMs } from "@/lib/utils/ensureMinDelay";
import { callOpenAIChat } from "@/lib/medx/providers";
import { languageDirectiveFor, SYSTEM_DEFAULT_LANG } from "@/lib/prompt/system";
import { SUPPORTED_LANGS } from "@/lib/i18n/constants";
import { createLocaleEnforcedStream, enforceLocale } from "@/lib/i18n/enforce";
import { buildFormatInstruction } from "@/lib/formats/build";
import { coerceToTable, hasMarkdownTable, needsTableCoercion } from "@/lib/formats/tableGuard";
import type { FormatId, Mode as FormatMode, Lang as FormatLang } from "@/lib/formats/types";

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
  const t0 = Date.now();
  const payload = await req.json();
  const { messages = [], mode } = payload ?? {};
  const rawFormat = typeof payload?.formatId === 'string' ? payload.formatId.trim().toLowerCase() : '';
  const formatId = rawFormat ? (rawFormat as FormatId) : undefined;
  const rawModeTag = typeof payload?.modeTag === 'string' ? payload.modeTag : undefined;
  let normalizedModeTag = (rawModeTag || '').toLowerCase();
  if (!normalizedModeTag && typeof mode === 'string') {
    const lowered = mode.toLowerCase();
    if (lowered === 'doctor') normalizedModeTag = 'clinical';
    else if (lowered === 'aidoc') normalizedModeTag = 'aidoc';
    else if (lowered === 'therapy') normalizedModeTag = 'therapy';
    else if (lowered === 'clinical_research' || lowered === 'research') normalizedModeTag = 'clinical_research';
    else if (lowered === 'wellness_research') normalizedModeTag = 'wellness_research';
    else normalizedModeTag = 'wellness';
  }
  const requestedLang = typeof payload?.lang === 'string' ? payload.lang : undefined;
  const headerLang = req.headers.get('x-user-lang') || req.headers.get('x-lang') || undefined;
  const langTag = (requestedLang && requestedLang.trim()) || (headerLang && headerLang.trim()) || SYSTEM_DEFAULT_LANG;
  const lang = normalizeLangTag(langTag);
  const langDirective = languageDirectiveFor(lang);
  const formatInstruction = buildFormatInstruction(lang as FormatLang, normalizedModeTag as FormatMode, formatId);

  const lastUserMessage =
    messages.slice().reverse().find((m: any) => m.role === "user")?.content || "";

  // This endpoint is explicitly the OpenAI (final say) stream for non-basic modes.
  // Keep your current /api/chat/stream for Groq/basic.
  let system = "Validate all calculations and medical logic before answering. Correct any inconsistencies.";
  if ((process.env.CALC_AI_DISABLE || "0") !== "1") {
    try {
      const extracted = extractAll?.(lastUserMessage);
      const canonical = canonicalizeInputs?.(extracted);
      const computed = computeAll?.(canonical);
      const prelude = composeCalcPrelude?.(computed);
      if (prelude) system = `Use and verify these pre-computed values first:\n${prelude}`;
    } catch {}
  }

  const systemChunks = [langDirective, formatInstruction, system].filter(Boolean);
  system = systemChunks.join('\n\n');

  const minMs = minDelayMs();
  const modelStart = Date.now();
  const upstream = await ensureMinDelay<Response>(
    callOpenAIChat([{ role: "system", content: system }, ...messages], { stream: true }),
    minMs,
  );
  const modelMs = Date.now() - modelStart;

  if (needsTableCoercion(formatId)) {
    const raw = await upstream.text();
    if (!upstream.ok) {
      return new Response(`OpenAI stream error: ${raw}`, { status: 500 });
    }

    const fullText = raw
      .split(/\n\n/)
      .map(line => line.replace(/^data:\s*/, ''))
      .filter(line => line && line !== '[DONE]')
      .map(chunk => {
        try {
          return JSON.parse(chunk)?.choices?.[0]?.delta?.content ?? '';
        } catch {
          return '';
        }
      })
      .join('');

    const subject = (lastUserMessage || '').split('\n')[0]?.trim() || 'Comparison';

    let shaped = hasMarkdownTable(fullText) ? fullText : coerceToTable(subject, fullText);
    shaped = enforceLocale(shaped, lang, { forbidEnglishHeadings: true });

    const payload = { choices: [{ delta: { content: shaped, medx_reset: true } }] };
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
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
      "x-medx-model": process.env.OPENAI_TEXT_MODEL || "gpt-5",
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

  const formatFinalizer = needsTableCoercion(formatId)
    ? (text: string) => {
        if (hasMarkdownTable(text)) return text;
        const subject = (lastUserMessage || '').split('\n')[0]?.trim() || 'Comparison';
        return coerceToTable(subject, text);
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
    "x-medx-model": process.env.OPENAI_TEXT_MODEL || "gpt-5",
  });

  return new Response(enforcedStream, {
    status: 200,
    headers,
  });
}
