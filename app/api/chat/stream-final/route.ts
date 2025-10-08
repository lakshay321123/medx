import { createParser } from 'eventsource-parser';
import { languageDirectiveFor, SYSTEM_DEFAULT_LANG } from '@/lib/prompt/system';
import { SUPPORTED_LANGS } from '@/lib/i18n/constants';
import { normalizeModeTag } from '@/lib/i18n/normalize';
import { buildFormatInstruction } from '@/lib/formats/build';
import { FORMATS } from '@/lib/formats/registry';
import { isValidLang, isValidMode } from '@/lib/formats/constants';
import { needsTableCoercion } from '@/lib/formats/tableGuard';
import { hasMarkdownTable, shapeToTable } from '@/lib/formats/tableShape';
import type { FormatId, Mode } from '@/lib/formats/types';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

type PrepareResult = {
  upstreamUrl: string;
  upstreamHeaders: Record<string, string>;
  reqPayload: Record<string, unknown>;
  finalizeContext: FinalizeContext;
};

type FinalizeContext = {
  lang: string;
  lastUserMessage: string;
  shouldCoerceToTable: boolean;
  formatId?: FormatId;
  threadId?: string;
  modeTag?: string;
};

function normalizeLangTag(tag?: string | null) {
  if (!tag) return 'en';
  const base = tag.toLowerCase().split('-')[0].replace(/[^a-z]/g, '');
  return (SUPPORTED_LANGS as readonly string[]).includes(base as any) ? base : 'en';
}

async function prepareUpstream(req: Request): Promise<PrepareResult> {
  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const messages = Array.isArray(payload?.messages) ? payload.messages : [];
  const rawFormat = typeof payload?.formatId === 'string' ? payload.formatId.trim().toLowerCase() : '';
  const formatId = rawFormat && FORMATS.some((f) => f.id === rawFormat) ? (rawFormat as FormatId) : undefined;
  const rawModeTag = payload?.modeTag ?? payload?.mode;
  const normalizedModeTag = normalizeModeTag(rawModeTag);
  const resolvedMode: Mode = isValidMode(normalizedModeTag) ? normalizedModeTag : 'wellness';

  if (process.env.NODE_ENV !== 'production' && !payload?.modeTag) {
    console.warn('[medx] Missing modeTag in request body; falling back to legacy mode:', payload?.mode);
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
    messages.slice().reverse().find((m: any) => m?.role === 'user')?.content || '';

  let system = 'Validate all calculations and medical logic before answering. Correct any inconsistencies.';
  const systemChunks = [langDirective, formatInstruction, system].filter(Boolean);
  system = systemChunks.join('\n\n');

  const upstreamMessages = [{ role: 'system', content: system }, ...messages];

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error('OPENAI_API_KEY missing');
    (error as any).status = 500;
    throw error;
  }

  const model = process.env.OPENAI_TEXT_MODEL || 'gpt-5';

  const reqPayload: Record<string, unknown> = {
    model,
    messages: upstreamMessages,
    temperature: 0.1,
  };

  const finalizeContext: FinalizeContext = {
    lang,
    lastUserMessage,
    shouldCoerceToTable: Boolean(formatInstruction) && needsTableCoercion(formatId),
    formatId,
    threadId: typeof payload?.threadId === 'string' ? payload.threadId : undefined,
    modeTag: normalizedModeTag ?? undefined,
  };

  return {
    upstreamUrl: 'https://api.openai.com/v1/chat/completions',
    upstreamHeaders: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    reqPayload,
    finalizeContext,
  };
}

export async function POST(req: Request) {
  let prepared: PrepareResult;
  try {
    prepared = await prepareUpstream(req);
  } catch (error: any) {
    const status = typeof error?.status === 'number' ? error.status : 400;
    const message = typeof error?.message === 'string' ? error.message : 'Invalid request';
    return new Response(message, { status });
  }

  const { upstreamUrl, upstreamHeaders, reqPayload, finalizeContext } = prepared;

  const upstream = await fetch(upstreamUrl, {
    method: 'POST',
    headers: upstreamHeaders,
    body: JSON.stringify({ ...reqPayload, stream: true }),
    signal: AbortSignal.timeout(30000),
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => 'Upstream error');
    return new Response(text, { status: upstream.status || 500 });
  }

  const enc = new TextEncoder();
  const dec = new TextDecoder();
  let raw = '';

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(enc.encode(': ping\n\n'));

      const hb = setInterval(() => {
        try {
          controller.enqueue(enc.encode(': hb\n\n'));
        } catch {
          // ignore write errors
        }
      }, 10000);

      const parser = createParser((evt) => {
        if (evt.type !== 'event') return;
        const data = evt.data;

        if (data === '[DONE]') {
          clearInterval(hb);
          controller.enqueue(enc.encode('data: [DONE]\n\n'));
          controller.close();
          queueMicrotask(async () => {
            try {
              await finalizeOffPath(raw, req, finalizeContext);
            } catch {
              // swallow finalize errors
            }
          });
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const delta = parsed?.choices?.[0]?.delta?.content ?? '';
          if (delta) raw += delta;
        } catch {
          // ignore keep-alives and malformed events
        }

        controller.enqueue(enc.encode(`data: ${data}\n\n`));
      });

      (async () => {
        const reader = upstream.body!.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            parser.feed(dec.decode(value, { stream: true }));
          }
        } finally {
          clearInterval(hb);
        }
      })().catch((err) => {
        clearInterval(hb);
        controller.error(err);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

async function finalizeOffPath(raw: string, req: Request, context: FinalizeContext) {
  if (!raw) return;
  const { shouldCoerceToTable, lastUserMessage } = context;
  if (shouldCoerceToTable && !hasMarkdownTable(raw)) {
    const subject = (lastUserMessage || '').split('\n')[0]?.trim() || 'Comparison';
    const table = shapeToTable(subject, raw);
    void table;
  }
  // polishText → selfCheck → addEvidenceAnchorIfMedical → buildConstraintRecap → sanitizeLLM → finalReplyGuard
  // Persist via Node logger route with keepalive (single transaction for message+summary; see Section C).
}
