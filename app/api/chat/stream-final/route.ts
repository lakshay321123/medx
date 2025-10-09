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
  reqPayload: Record<string, unknown> & { model: string };
  finalizeContext: FinalizeContext;
  provider: 'openai';
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

async function prepareUpstream(req: Request, payload: any): Promise<PrepareResult> {
  const provider = typeof payload?.provider === 'string' ? payload.provider.trim().toLowerCase() : '';
  if (!provider || provider !== 'openai') {
    const error = new Error('Unsupported provider. Expected "openai".');
    (error as any).status = 400;
    throw error;
  }

  const messages = Array.isArray(payload?.messages) ? payload.messages : [];
  if (!messages.length) {
    const error = new Error('messages must be a non-empty array.');
    (error as any).status = 400;
    throw error;
  }

  const invalidMessage = messages.find(
    (m: any) => typeof m?.role !== 'string' || typeof m?.content !== 'string' || !m.role.trim()
  );
  if (invalidMessage) {
    const error = new Error('Each message must include string role and content.');
    (error as any).status = 400;
    throw error;
  }

  const normalizedMessages = messages.map((m: any) => ({
    role: m.role,
    content: m.content,
  }));
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

  const upstreamMessages = [{ role: 'system', content: system }, ...normalizedMessages];

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error('OPENAI_API_KEY missing');
    (error as any).status = 500;
    throw error;
  }

  const requestedModel = typeof payload?.model === 'string' ? payload.model.trim() : '';
  if (!requestedModel) {
    const error = new Error('model is required.');
    (error as any).status = 400;
    throw error;
  }
  const model = requestedModel;

  const reqPayload: Record<string, unknown> & { model: string } = {
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
    provider: 'openai',
  };
}

export async function POST(req: Request) {
  const contentType = req.headers.get('content-type')?.toLowerCase() || '';
  if (!contentType.includes('application/json')) {
    return jsonResponse({ error: 'Expected application/json request body.' }, 400);
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400);
  }

  if (!payload || typeof payload !== 'object') {
    return jsonResponse({ error: 'Request body must be a JSON object.' }, 400);
  }

  let prepared: PrepareResult;
  try {
    prepared = await prepareUpstream(req, payload);
  } catch (error: any) {
    const status = typeof error?.status === 'number' ? error.status : 400;
    const message = typeof error?.message === 'string' ? error.message : 'Invalid request';
    return jsonResponse({ error: message }, status);
  }

  const { upstreamUrl, upstreamHeaders, reqPayload, finalizeContext, provider } = prepared;

  const upstream = await fetch(upstreamUrl, {
    method: 'POST',
    headers: upstreamHeaders,
    body: JSON.stringify({ ...reqPayload, stream: true }),
    signal: AbortSignal.timeout(30000),
  });

  if (!upstream.ok || !upstream.body) {
    if (upstream.status >= 400 && upstream.status < 500) {
      const reason = await readUpstreamSnippet(upstream.body, 1000);
      return jsonResponse(
        {
          upstream_status: upstream.status,
          model: reqPayload.model,
          provider,
          reason,
        },
        upstream.status || 400
      );
    }

    const reason = upstream.body ? await readUpstreamSnippet(upstream.body, 400) : 'Upstream error';
    return jsonResponse({ error: reason || 'Upstream error' }, upstream.status || 502);
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

      let buf = '';

      const handleEvent = (evt: string) => {
        const lines = evt.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trimStart();
          if (!data) continue;

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
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            const delta = parsed?.choices?.[0]?.delta?.content ?? '';
            if (delta) raw += delta;
          } catch {
            // ignore keep-alives and malformed events
          }

          controller.enqueue(enc.encode(`data: ${data}\n\n`));
        }
      };

      (async () => {
        const reader = upstream.body!.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buf += dec.decode(value, { stream: true });

          let idx: number;
          while ((idx = buf.indexOf('\n\n')) !== -1) {
            const evt = buf.slice(0, idx);
            buf = buf.slice(idx + 2);
            if (evt.trim()) handleEvent(evt);
          }
        }

        if (buf.trim()) handleEvent(buf);
        clearInterval(hb);
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

function jsonResponse(payload: any, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function readUpstreamSnippet(
  stream: ReadableStream<Uint8Array> | null,
  limit: number
): Promise<string> {
  if (!stream) return 'Upstream returned no response body.';

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = '';

  try {
    while (result.length < limit) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        result += decoder.decode(value, { stream: true });
        if (result.length >= limit) break;
      }
    }
    result += decoder.decode();
  } catch {
    // ignore streaming read errors on diagnostics path
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // ignore release errors
    }
  }

  const trimmed = result.trim();
  return trimmed.slice(0, limit) || 'Unknown upstream error.';
}
