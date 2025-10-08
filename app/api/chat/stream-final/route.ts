import { createParser } from 'eventsource-parser';
import { languageDirectiveFor, SYSTEM_DEFAULT_LANG } from '@/lib/prompt/system';
import { SUPPORTED_LANGS } from '@/lib/i18n/constants';
import { normalizeModeTag } from '@/lib/i18n/normalize';
import { buildFormatInstruction } from '@/lib/formats/build';
import { FORMATS } from '@/lib/formats/registry';
import { isValidLang, isValidMode } from '@/lib/formats/constants';
import { needsTableCoercion } from '@/lib/formats/tableGuard';
import type { FormatId, Mode } from '@/lib/formats/types';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

class UpstreamError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

type PrepareResult = {
  upstreamUrl: string;
  upstreamHeaders: HeadersInit;
  reqPayload: Record<string, any>;
  models: string[];
  provider: 'openai';
  finalizeContext: {
    lang: string;
    shouldCoerceToTable: boolean;
    formatId?: FormatId;
    lastUserMessage: string;
  };
  metrics: {
    prepMs: number;
  };
};

type CalcModules = {
  composeCalcPrelude?: (computed: any) => string | null | undefined;
  extractAll?: (text: string) => any;
  canonicalizeInputs?: (extracted: any) => any;
  computeAll?: (canonical: any) => any;
};

let calcModulesPromise: Promise<CalcModules> | null = null;

async function loadCalcModules(): Promise<CalcModules> {
  if (!calcModulesPromise) {
    calcModulesPromise = (async () => {
      try {
        const [prelude, extract, compute] = await Promise.all([
          import('@/lib/medical/engine/prelude'),
          import('@/lib/medical/engine/extract'),
          import('@/lib/medical/engine/computeAll'),
        ]);
        return {
          composeCalcPrelude: prelude.composeCalcPrelude,
          extractAll: extract.extractAll,
          canonicalizeInputs: extract.canonicalizeInputs,
          computeAll: compute.computeAll,
        };
      } catch {
        return {};
      }
    })();
  }
  return calcModulesPromise;
}

function normalizeLangTag(tag?: string | null) {
  if (!tag) return 'en';
  const base = tag.toLowerCase().split('-')[0].replace(/[^a-z]/g, '');
  return (SUPPORTED_LANGS as readonly string[]).includes(base as any) ? base : 'en';
}

async function prepareUpstream(req: Request): Promise<PrepareResult> {
  const prepStart = Date.now();
  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const messages = Array.isArray(payload?.messages) ? payload.messages : [];
  const mode = payload?.mode;
  const rawFormat = typeof payload?.formatId === 'string' ? payload.formatId.trim().toLowerCase() : '';
  const formatId = rawFormat && FORMATS.some(f => f.id === rawFormat) ? (rawFormat as FormatId) : undefined;

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

  const lastUserMessage = messages.slice().reverse().find((m: any) => m?.role === 'user')?.content || '';
  let system = 'Validate all calculations and medical logic before answering. Correct any inconsistencies.';

  if ((process.env.CALC_AI_DISABLE || '0') !== '1' && lastUserMessage) {
    try {
      const { composeCalcPrelude, extractAll, canonicalizeInputs, computeAll } = await loadCalcModules();
      if (composeCalcPrelude && extractAll && canonicalizeInputs && computeAll) {
        const extracted = extractAll(lastUserMessage);
        const canonical = canonicalizeInputs(extracted);
        const computed = computeAll(canonical);
        const prelude = composeCalcPrelude(computed);
        if (prelude) {
          system = `Use and verify these pre-computed values first:\n${prelude}`;
        }
      }
    } catch {
      // ignore calculator errors; streaming must proceed
    }
  }

  const systemChunks = [langDirective, formatInstruction, system].filter(Boolean);
  const systemMessage = systemChunks.join('\n\n');
  const chatMessages = [{ role: 'system', content: systemMessage }, ...messages];

  const reqPayload: Record<string, any> = { messages: chatMessages };
  const temperature = typeof payload?.temperature === 'number' ? payload.temperature : undefined;
  if (typeof temperature === 'number') reqPayload.temperature = temperature;
  const maxTokens = typeof payload?.max_tokens === 'number' ? payload.max_tokens : undefined;
  if (typeof maxTokens === 'number') reqPayload.max_tokens = maxTokens;

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new UpstreamError('OPENAI_API_KEY missing', 500);
  }

  const upstreamHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
  };

  const primaryModel = process.env.OPENAI_TEXT_MODEL || 'gpt-5';
  const fallbackModels = (process.env.OPENAI_FALLBACK_MODELS || 'gpt-4o,gpt-4o-mini')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const models = [primaryModel, ...fallbackModels].filter((model, idx, arr) => arr.indexOf(model) === idx);

  const shouldCoerceToTable = Boolean(formatInstruction) && needsTableCoercion(formatId);

  return {
    upstreamUrl: OPENAI_URL,
    upstreamHeaders,
    reqPayload,
    models,
    provider: 'openai',
    finalizeContext: {
      lang,
      shouldCoerceToTable,
      formatId,
      lastUserMessage,
    },
    metrics: {
      prepMs: Date.now() - prepStart,
    },
  };
}

async function fetchWithFallback(prepared: PrepareResult) {
  const { upstreamUrl, upstreamHeaders, reqPayload, models } = prepared;
  if (!models.length) {
    throw new UpstreamError('No OpenAI models configured', 500);
  }

  let lastErr: unknown = null;

  for (const model of models) {
    let triedWithoutTemp = false;
    // Attempt with and without temperature if needed for compatibility.
    for (;;) {
      const omitTemperature = triedWithoutTemp || /^gpt-5/i.test(model);
      const attemptPayload: Record<string, any> = { ...reqPayload, model, stream: true };
      if (omitTemperature && 'temperature' in attemptPayload) {
        delete attemptPayload.temperature;
      }

      try {
        const res = await fetch(upstreamUrl, {
          method: 'POST',
          headers: upstreamHeaders,
          body: JSON.stringify(attemptPayload),
          signal: AbortSignal.timeout(30000),
        });

        if (res.ok && res.body) {
          return { response: res, model };
        }

        const text = await res.text().catch(() => '');
        if (!triedWithoutTemp && !omitTemperature && res.status === 400 && /temperature/i.test(text) && /unsupported/i.test(text)) {
          triedWithoutTemp = true;
          continue;
        }

        lastErr = new UpstreamError(`OpenAI ${model} error ${res.status}: ${text.slice(0, 200)}`, res.status);
        break;
      } catch (err) {
        lastErr = err;
        break;
      }
    }
  }

  if (lastErr instanceof UpstreamError) {
    throw lastErr;
  }
  throw new UpstreamError(String(lastErr || 'OpenAI stream error'), 502);
}

type FinalizeContext = PrepareResult['finalizeContext'];

async function finalizeOffPath(raw: string, _req: Request, ctx: FinalizeContext) {
  void ctx;
  if (!raw) return;
  // Placeholders for any asynchronous post-processing (logging, persistence, etc.).
}

export async function POST(req: Request) {
  let prepared: PrepareResult;
  try {
    prepared = await prepareUpstream(req);
  } catch (error: any) {
    const status = error instanceof UpstreamError && error.status ? error.status : 500;
    const message = error instanceof Error ? error.message : 'Failed to prepare upstream request';
    return new Response(message, { status });
  }

  const fetchStart = Date.now();
  let upstream;
  try {
    upstream = await fetchWithFallback(prepared);
  } catch (error: any) {
    const status = error instanceof UpstreamError && error.status ? error.status : 502;
    const message = error instanceof Error ? error.message : 'Upstream error';
    return new Response(message, { status });
  }

  if (!upstream.response.body) {
    return new Response('Upstream stream missing body', { status: 502 });
  }

  const modelInitMs = Date.now() - fetchStart;
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let raw = '';
      let closed = false;

      const closeStream = () => {
        if (closed) return;
        closed = true;
        try {
          controller.enqueue(enc.encode('data: [DONE]\n\n'));
        } catch {}
        try {
          controller.close();
        } catch {}
        queueMicrotask(() => {
          void finalizeOffPath(raw, req, prepared.finalizeContext);
        });
      };

      try {
        controller.enqueue(enc.encode(': ping\n\n'));
      } catch {}

      const hb = setInterval(() => {
        try {
          controller.enqueue(enc.encode(': hb\n\n'));
        } catch {
          clearInterval(hb);
        }
      }, 10000);

      const parser = createParser(event => {
        if (event.type !== 'event') return;
        const data = event.data;
        if (data === '[DONE]') {
          clearInterval(hb);
          closeStream();
          return;
        }

        if (data) {
          try {
            const parsed = JSON.parse(data);
            const deltaNode = parsed?.choices?.[0]?.delta ?? {};
            const resetStream = deltaNode?.medx_reset === true;
            const delta = typeof deltaNode?.content === 'string' ? deltaNode.content : '';
            if (resetStream) {
              raw = delta || '';
            } else if (delta) {
              raw += delta;
            }
          } catch {
            // ignore malformed SSE payloads (likely keepalives)
          }
        }

        try {
          controller.enqueue(enc.encode(`data: ${data}\n\n`));
        } catch {
          clearInterval(hb);
        }
      });

      (async () => {
        const reader = upstream.response.body!.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              parser.feed(dec.decode(value, { stream: true }));
            }
          }
        } finally {
          clearInterval(hb);
          closeStream();
        }
      })().catch(error => {
        clearInterval(hb);
        try {
          controller.error(error);
        } catch {}
      });
    },
  });

  const headers = new Headers({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    'x-medx-provider': prepared.provider,
    'x-medx-model': upstream.model,
  });

  const timings: string[] = [];
  if (Number.isFinite(prepared.metrics.prepMs)) {
    timings.push(`prep;dur=${Math.max(0, Math.round(prepared.metrics.prepMs))}`);
  }
  if (Number.isFinite(modelInitMs)) {
    timings.push(`model_init;dur=${Math.max(0, Math.round(modelInitMs))}`);
  }
  if (timings.length) {
    headers.set('Server-Timing', timings.join(','));
  }

  return new Response(stream, {
    status: 200,
    headers,
  });
}
