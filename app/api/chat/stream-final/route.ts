import { callOpenAIChat } from "@/lib/medx/providers";
import { languageDirectiveFor, SYSTEM_DEFAULT_LANG } from "@/lib/prompt/system";
import { SUPPORTED_LANGS } from "@/lib/i18n/constants";
import { normalizeModeTag } from "@/lib/i18n/normalize";
import { buildFormatInstruction } from "@/lib/formats/build";
import { FORMATS } from "@/lib/formats/registry";
import { isValidLang, isValidMode } from "@/lib/formats/constants";
import { needsTableCoercion } from "@/lib/formats/tableGuard";
import { shapeToTable } from "@/lib/formats/tableShape";
import type { FormatId, Mode } from "@/lib/formats/types";
import { enforceLocale } from "@/lib/i18n/enforce";
import { createParser } from "eventsource-parser";
import { polishText } from "@/lib/text/polish";
import { selfCheck } from "@/lib/text/selfCheck";
import { addEvidenceAnchorIfMedical } from "@/lib/text/medicalAnchor";
import { buildConstraintRecap } from "@/lib/text/recap";
import { sanitizeLLM } from "@/lib/conversation/sanitize";
import { finalReplyGuard } from "@/lib/conversation/finalReplyGuard";
import { updateSummary } from "@/lib/memory/summary";

// Optional calculator prelude (safe if engine absent)
let composeCalcPrelude: any, extractAll: any, canonicalizeInputs: any, computeAll: any;
try {
  ({ composeCalcPrelude } = require("@/lib/medical/engine/prelude"));
  ({ extractAll, canonicalizeInputs } = require("@/lib/medical/engine/extract"));
  ({ computeAll } = require("@/lib/medical/engine/computeAll"));
} catch {}

export const runtime = "edge";
export const dynamic = "force-dynamic";

function normalizeLangTag(tag?: string | null) {
  if (!tag) return "en";
  const base = tag.toLowerCase().split("-")[0].replace(/[^a-z]/g, "");
  return (SUPPORTED_LANGS as readonly string[]).includes(base as any) ? base : "en";
}

type FinalizeContext = {
  req: Request;
  userText: string;
  state?: any;
  threadId?: string | null;
  persist: boolean;
  researchSources: any[];
};

function resolveBaseUrl(req: Request) {
  const envBase = process.env.NEXT_PUBLIC_BASE_URL;
  if (envBase) return envBase.replace(/\/$/, "");
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") || url.protocol.replace(/:$/, "");
  const host = req.headers.get("x-forwarded-host") || url.host;
  return `${proto}://${host}`;
}

async function finalizeNonBlocking(raw: string, ctx: FinalizeContext) {
  const trimmed = raw.trim();
  if (!trimmed) return;

  try {
    let assistant = polished(trimmed, ctx);

    if (ctx.persist && ctx.threadId) {
      const prevSummary = typeof ctx.state?.runningSummary === "string" ? ctx.state.runningSummary : "";
      const nextSummary = updateSummary(prevSummary, ctx.userText, assistant);
      const expectedVersion = typeof ctx.state?.threadVersion === "number"
        ? ctx.state.threadVersion
        : typeof ctx.state?.version === "number"
          ? ctx.state.version
          : undefined;

      await fetch(`${resolveBaseUrl(ctx.req)}/api/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "assistant_append_summary",
          threadId: ctx.threadId,
          assistantContent: assistant,
          newSummary: nextSummary,
          expectedVersion,
        }),
        keepalive: true,
      }).catch(() => {});
    }
  } catch (err) {
    console.error("[stream-final] finalize failed", err);
  }
}

function polished(raw: string, ctx: Pick<FinalizeContext, "state" | "userText">) {
  let assistant = raw;
  assistant = polishText(assistant);
  const check = selfCheck(assistant, ctx.state?.constraints, ctx.state?.entities);
  assistant = check.fixed;
  assistant = addEvidenceAnchorIfMedical(assistant);
  const recap = buildConstraintRecap(ctx.state?.constraints);
  if (recap) assistant += recap;
  assistant = sanitizeLLM(assistant);
  assistant = finalReplyGuard(ctx.userText, assistant);
  return assistant;
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  console.log("[stream-final] start", startedAt);

  const payload = await req.json();
  const { messages = [], mode } = payload ?? {};
  const rawFormat = typeof payload?.formatId === "string" ? payload.formatId.trim().toLowerCase() : "";
  const formatId = rawFormat && FORMATS.some((f) => f.id === rawFormat) ? (rawFormat as FormatId) : undefined;
  const rawModeTag = payload?.modeTag ?? mode;
  const normalizedModeTag = normalizeModeTag(rawModeTag);
  const resolvedMode: Mode = isValidMode(normalizedModeTag) ? normalizedModeTag : "wellness";
  if (process.env.NODE_ENV !== "production" && !payload?.modeTag) {
    console.warn("[medx] Missing modeTag in request body; falling back to legacy mode:", mode);
  }

  const requestedLang = typeof payload?.lang === "string" ? payload.lang : undefined;
  const headerLang = req.headers.get("x-user-lang") || req.headers.get("x-lang") || undefined;
  const langTag = (requestedLang && requestedLang.trim()) || (headerLang && headerLang.trim()) || SYSTEM_DEFAULT_LANG;
  const lang = normalizeLangTag(langTag);
  const langDirective = languageDirectiveFor(lang);
  const formatInstruction = isValidLang(lang) ? buildFormatInstruction(lang, resolvedMode, formatId) : "";

  const lastUserMessage =
    messages.slice().reverse().find((m: any) => m.role === "user")?.content || "";

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
  system = systemChunks.join("\n\n");

  const userText = typeof payload?.userText === "string"
    ? payload.userText
    : messages.map((m: any) => (typeof m.content === "string" ? m.content : ""))
        .filter(Boolean)
        .slice(-1)[0] || lastUserMessage || "";

  const abortSignal = typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
    ? AbortSignal.timeout(30_000)
    : undefined;

  const modelStart = Date.now();
  const upstream = await callOpenAIChat(
    [{ role: "system", content: system }, ...messages],
    { stream: true, signal: abortSignal },
  );
  const modelMs = Date.now() - modelStart;
  console.log("[stream-final] upstream ready ms=", modelMs);

  const modeAllowed = Boolean(formatInstruction);
  const shouldCoerceToTable = modeAllowed && needsTableCoercion(formatId);
  const inlineTableCoercionEnabled = process.env.TABLE_COERCE_INLINE === "1";

  const conversationId =
    (typeof payload?.conversationId === "string" && payload.conversationId) ||
    req.headers.get("x-conversation-id") ||
    undefined;

  const persist = payload?.persist !== false;
  const threadId = typeof payload?.threadId === "string" ? payload.threadId : payload?.threadId ?? undefined;
  const state = payload?.state;
  const researchSources = Array.isArray(payload?.researchSources) ? payload.researchSources : [];

  const finalizeCtx: FinalizeContext = {
    req,
    userText,
    state,
    threadId,
    persist,
    researchSources,
  };

  if (inlineTableCoercionEnabled && shouldCoerceToTable) {
    const rawSse = await upstream.text();
    if (!upstream.ok) {
      return new Response(rawSse || "OpenAI stream error", { status: upstream.status || 500 });
    }

    const fullText = rawSse
      .split(/\n\n/)
      .map((line) => line.replace(/^data:\s*/, ""))
      .filter(Boolean)
      .filter((line) => line !== "[DONE]")
      .map((chunk) => {
        try {
          return JSON.parse(chunk)?.choices?.[0]?.delta?.content ?? "";
        } catch {
          return "";
        }
      })
      .join("");

    const subject = (lastUserMessage || "").split("\n")[0]?.trim() || "Comparison";
    let table = shapeToTable(subject, fullText);
    table = enforceLocale(table, lang, { forbidEnglishHeadings: true });
    const payloadStream = {
      choices: [{ delta: { content: table, medx_reset: true, medx_sources: researchSources } }],
    };

    queueMicrotask(() => {
      finalizeNonBlocking(table, finalizeCtx);
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payloadStream)}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    const totalMs = Date.now() - startedAt;
    const appMs = Math.max(0, totalMs - modelMs);
    const headers = new Headers({
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Transfer-Encoding": "chunked",
      "Server-Timing": `app;dur=${appMs},model;dur=${modelMs}`,
      "x-medx-provider": "openai",
      "x-medx-model": process.env.OPENAI_TEXT_MODEL || "gpt-5",
      "X-Accel-Buffering": "no",
    });
    if (conversationId) headers.set("x-conversation-id", conversationId);

    return new Response(stream, { status: 200, headers });
  }

  if (!upstream?.ok || !upstream.body) {
    const err = upstream ? await upstream.text().catch(() => "Upstream error") : "Upstream error";
    return new Response(`OpenAI stream error: ${err}`, { status: upstream?.status || 500 });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let aggregatedRaw = "";
  let sanitizedSoFar = "";

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const heartbeatMs = 10_000;
      controller.enqueue(encoder.encode(": ping\n\n"));
      if (researchSources.length) {
        const payload = { choices: [{ delta: { medx_sources: researchSources } }] };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      }

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": hb\n\n"));
        } catch (err) {
          clearInterval(heartbeat);
        }
      }, heartbeatMs);

      const parser = createParser((event) => {
        if (event.type !== "event") return;
        const data = event.data;
        if (data === "[DONE]") {
          clearInterval(heartbeat);
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          queueMicrotask(() => finalizeNonBlocking(sanitizedSoFar, finalizeCtx));
          return;
        }

        let parsed: any;
        try {
          parsed = JSON.parse(data);
        } catch {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          return;
        }

        const choices = Array.isArray(parsed?.choices) ? parsed.choices : [];
        const primary = choices[0];
        const delta = primary?.delta;
        const content = typeof delta?.content === "string" ? delta.content : "";

        if (content) {
          aggregatedRaw += content;
          const sanitized = enforceLocale(aggregatedRaw, lang, { forbidEnglishHeadings: true });
          const previous = sanitizedSoFar;

          if (!sanitized.startsWith(previous)) {
            sanitizedSoFar = sanitized;
            const nextPayload = {
              ...parsed,
              choices: choices.map((choice: any, index: number) =>
                index === 0
                  ? {
                      ...choice,
                      delta: {
                        ...(choice?.delta || {}),
                        content: sanitized,
                        medx_reset: true,
                      },
                    }
                  : choice,
              ),
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(nextPayload)}\n\n`));
            return;
          }

          const addition = sanitized.slice(previous.length);
          sanitizedSoFar = sanitized;
          if (addition) {
            const nextPayload = {
              ...parsed,
              choices: choices.map((choice: any, index: number) =>
                index === 0
                  ? {
                      ...choice,
                      delta: {
                        ...(choice?.delta || {}),
                        content: addition,
                      },
                    }
                  : choice,
              ),
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(nextPayload)}\n\n`));
            return;
          }
          return;
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify(parsed)}\n\n`));
      });

      (async () => {
        try {
          const reader = upstream.body!.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) parser.feed(decoder.decode(value, { stream: true }));
          }
          clearInterval(heartbeat);
        } catch (err) {
          clearInterval(heartbeat);
          controller.error(err);
        }
      })();
    },
  });

  const totalMs = Date.now() - startedAt;
  const appMs = Math.max(0, totalMs - modelMs);
  const headers = new Headers({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "Transfer-Encoding": "chunked",
    "Server-Timing": `app;dur=${appMs},model;dur=${modelMs}`,
    "x-medx-provider": "openai",
    "x-medx-model": process.env.OPENAI_TEXT_MODEL || "gpt-5",
    "X-Accel-Buffering": "no",
  });
  if (conversationId) headers.set("x-conversation-id", conversationId);

  return new Response(stream, {
    status: 200,
    headers,
  });
}
