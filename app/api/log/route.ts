export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { appendMessage, setRunningSummary } from "@/lib/memory/store";
import { appendAssistantAndUpdateSummaryAtomic } from "@/lib/db/threadWrites";

const MAX_BYTES = 64 * 1024;

const chatEventSchema = z.object({
  type: z.literal("chat_event"),
  event: z
    .object({
      id: z.string().min(1),
      kind: z.string().min(1),
      conversationId: z.string().optional(),
      userId: z.string().optional(),
      threadId: z.string().optional(),
      metadata: z.record(z.unknown()).optional(),
      createdAt: z.string().optional(),
    })
    .strict(),
});

const persistMessageSchema = z.object({
  type: z.literal("persist_message"),
  data: z
    .object({
      threadId: z.string().min(1),
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1),
    })
    .strict(),
});

const finalizeTurnSchema = z.object({
  type: z.literal("finalize_turn"),
  data: z
    .object({
      threadId: z.string().min(1),
      assistant: z.string().min(1),
      summary: z.string().optional(),
    })
    .strict(),
});

const appendSummarySchema = z.object({
  kind: z.literal("assistant_append_summary"),
  threadId: z.string().min(1),
  assistantContent: z.string().min(1),
  newSummary: z.string(),
  expectedVersion: z.number().int().nonnegative().optional(),
}).strict();

const requestSchema = z.union([chatEventSchema, persistMessageSchema, finalizeTurnSchema]);

export async function POST(req: Request) {
  const text = await readBody(req);
  if (text === null) {
    return NextResponse.json({ ok: false, error: "payload_too_large" }, { status: 413 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (parsed && typeof parsed === "object" && (parsed as any)?.kind === "assistant_append_summary") {
    const summaryCheck = appendSummarySchema.safeParse(parsed);
    if (!summaryCheck.success) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    }
    const { threadId, assistantContent, newSummary, expectedVersion } = summaryCheck.data;
    try {
      await appendAssistantAndUpdateSummaryAtomic({
        threadId,
        assistantContent,
        newSummary,
        expectedVersion,
      });
      return NextResponse.json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message === "prisma_unavailable" || message === "prisma_models_missing") {
        console.warn("[log]", message, "– skipping assistant append");
        return NextResponse.json({ ok: true, skipped: true });
      }
      const status = message === "version_conflict" ? 409 : 500;
      return NextResponse.json({ ok: false, error: message }, { status });
    }
  }

  const validation = requestSchema.safeParse(parsed);
  if (!validation.success) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const payload = validation.data;

  try {
    if (payload.type === "chat_event") {
      await persistChatEvent(payload.event);
      return NextResponse.json({ ok: true });
    }

    if (payload.type === "persist_message") {
      await persistMessage(payload.data);
      return NextResponse.json({ ok: true });
    }

    if (payload.type === "finalize_turn") {
      await persistFinalizedTurn(payload.data);
      return NextResponse.json({ ok: true });
    }
  } catch (err) {
    console.error("[log] persistence failed", err);
    return NextResponse.json({ ok: false, error: "persistence_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: false, error: "unsupported" }, { status: 400 });
}

async function readBody(req: Request): Promise<string | null> {
  const contentLengthHeader = req.headers.get("content-length");
  if (contentLengthHeader && Number(contentLengthHeader) > MAX_BYTES) {
    return null;
  }

  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) {
    return null;
  }
  return buf.toString("utf8");
}

async function persistChatEvent(event: z.infer<typeof chatEventSchema>["event"]) {
  if (!prisma || typeof (prisma as any).chatEvent?.create !== "function") {
    console.warn("[log] prisma chatEvent.create unavailable; skipping");
    return;
  }
  await (prisma as any).chatEvent.create({ data: event });
}

async function persistMessage(data: z.infer<typeof persistMessageSchema>["data"]) {
  if (!prisma || typeof (prisma as any).message?.create !== "function") {
    console.warn("[log] prisma message.create unavailable; skipping");
    return;
  }
  await appendMessage({
    threadId: data.threadId,
    role: data.role,
    content: data.content,
  });
}

async function persistFinalizedTurn(data: z.infer<typeof finalizeTurnSchema>["data"]) {
  try {
    await appendAssistantAndUpdateSummaryAtomic({
      threadId: data.threadId,
      assistantContent: data.assistant,
      newSummary: data.summary ?? "",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "prisma_unavailable" || message === "prisma_models_missing") {
      console.warn("[log]", message, "– fallback persistence");
    } else if (message === "version_conflict") {
      console.warn("[log] version conflict while finalizing turn", err);
      throw err;
    } else {
      console.error("[log] atomic finalize failed", err);
    }

    if (!prisma) {
      return;
    }

    const summaryText = data.summary ?? "";
    const prismaAny = prisma as any;
    const messageModel = prismaAny.message;
    const threadModel = prismaAny.chatThread;

    if (messageModel?.create) {
      await appendMessage({ threadId: data.threadId, role: "assistant", content: data.assistant });
    }

    if (threadModel?.update) {
      await setRunningSummary(data.threadId, summaryText);
    }
  }
}
