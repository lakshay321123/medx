import { ensureMinDelay, minDelayMs } from "@/lib/utils/ensureMinDelay";
import { callOpenAIChat } from "@/lib/medx/providers";
import { languageDirectiveFor, SYSTEM_DEFAULT_LANG } from "@/lib/prompt/system";
import { SUPPORTED_LANGS } from "@/lib/i18n/constants";
import { normalizeModeTag } from "@/lib/i18n/normalize";
import { buildFormatInstruction } from "@/lib/formats/build";
import { FORMATS } from "@/lib/formats/registry";
import { isValidLang, isValidMode } from "@/lib/formats/constants";
import { needsTableCoercion } from "@/lib/formats/tableGuard";
import { hasMarkdownTable, shapeToTable } from "@/lib/formats/tableShape";
import { sanitizeMarkdownTable } from "@/lib/formats/tableQuality";
import type { FormatId, Mode } from "@/lib/formats/types";

function proxySseWithFinalizer(upstream: ReadableStream<Uint8Array>, finalizer?: (full: string) => string) {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  let buffer = '';

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const reader = upstream.getReader();
      const push = (s: string) => controller.enqueue(enc.encode(s));

      function handleChunk(chunk: string) {
        const frames = chunk.split('\n\n');
        for (const frame of frames) {
          if (!frame.trim()) continue;
          const line = frame.trim();
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (payload === '[DONE]') continue;
          push(frame + '\n\n');
          try {
            const evt = JSON.parse(payload);
            if (evt?.role === 'assistant' && typeof evt?.content === 'string') {
              buffer += evt.content;
            }
            const choices = Array.isArray(evt?.choices) ? evt.choices : [];
            for (const choice of choices) {
              const delta = choice?.delta;
              if (delta && typeof delta.content === 'string') buffer += delta.content;
            }
          } catch {
            // ignore parse errors
          }
        }
      }

      const pump = (): any =>
        reader.read().then(({ done, value }) => {
          if (done) {
            if (finalizer) {
              try {
                const finalized = finalizer(buffer || '');
                push(`data: ${JSON.stringify({ role: 'assistant', content: finalized })}\n\n`);
              } catch {
                // keep stream alive even if finalizer fails
              }
            }
            push('data: [DONE]\n\n');
            controller.close();
            return;
          }
          const chunk = dec.decode(value, { stream: true });
          handleChunk(chunk);
          return pump();
        });
      pump();
    }
  });
}

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
  const rawFormat = typeof payload?.formatId === 'string'
    ? payload.formatId.trim().toLowerCase()
    : '';
  const formatId = rawFormat && FORMATS.some(f => f.id === rawFormat)
    ? (rawFormat as FormatId)
    : undefined;
  const formatPinned: boolean = payload?.formatPinned === true;
  const rawHint = typeof payload?.formatHint === 'string'
    ? payload.formatHint.trim().toLowerCase()
    : '';
  const formatHint: FormatId | undefined =
    rawHint && FORMATS.some(f => f.id === rawHint) ? (rawHint as FormatId) : undefined;
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
  const safeLang = (isValidLang(lang) ? lang : 'en') as any;
  const formatInstructionFor = (fid?: FormatId) =>
    buildFormatInstruction(safeLang, resolvedMode, fid);
  const isAllowed = (fid?: FormatId) => (fid ? Boolean(formatInstructionFor(fid)) : false);

  const effectiveFormatId: FormatId | undefined = (() => {
    if (formatPinned && isAllowed(formatId)) return formatId!;
    if (isAllowed(formatHint)) return formatHint!;
    if (!formatPinned && isAllowed(formatId)) return formatId!;
    return undefined; // mode default
  })();

  const formatInstruction = buildFormatInstruction(safeLang, resolvedMode, effectiveFormatId);

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

  const modeAllowsEffective =
    !effectiveFormatId || FORMATS.some(f => f.id === effectiveFormatId && f.allowedModes.includes(resolvedMode));
  const shouldCoerceToTable = modeAllowsEffective && needsTableCoercion(effectiveFormatId);

  if (!upstream?.ok || !upstream.body) {
    const err = upstream ? await upstream.text().catch(() => "Upstream error") : "Upstream error";
    return new Response(`OpenAI stream error: ${err}`, { status: upstream?.status || 500 });
  }

  const formatFinalizer = shouldCoerceToTable
    ? (text: string) => {
        if (hasMarkdownTable(text)) return text;
        const subject = (lastUserMessage || '').split('\n')[0]?.trim() || 'Comparison';
        return sanitizeMarkdownTable(shapeToTable(subject, text));
      }
    : undefined;

  const proxied = proxySseWithFinalizer(upstream.body, formatFinalizer);

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

  return new Response(proxied, {
    status: upstream.status,
    headers,
  });
}
