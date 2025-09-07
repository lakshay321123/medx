import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appendMessage } from "@/lib/memory/store";
import { decideOutOfContext, seedTopicEmbedding } from "@/lib/memory/outOfContext";
import { updateSummary, persistUpdatedSummary } from "@/lib/memory/summary";
import { buildPromptContext } from "@/lib/memory/contextBuilder";

// Swap with your LLM client
async function callLLM(system: string, recent: {role: string, content: string}[], userText: string) {
  const messages = [
    { role: "system", content: system },
    ...recent.map(m => ({ role: m.role as any, content: m.content })),
    { role: "user", content: userText },
  ];
  // TODO: Replace with actual LLM call. For now echo:
  return `Noted. (demo) You said: ${userText}`;
}

export async function POST(req: Request) {
  const { threadId, userId, text, mode, researchOn } = await req.json();

  // 1) If first message in a thread, create thread
  let thread = await prisma.chatThread.findUnique({ where: { id: threadId } });
  if (!thread) {
    thread = await prisma.chatThread.create({
      data: { id: threadId, userId, title: "New chat" },
    });
    await seedTopicEmbedding(thread.id, text);
  }

  // 2) Out-of-context? Branch to new thread automatically
  const decision = await decideOutOfContext(thread.id, text);
  let activeThreadId = thread.id;
  if (decision.isOutOfContext) {
    const branched = await prisma.chatThread.create({
      data: {
        userId,
        title: "New topic",
        runningSummary: "",
      },
    });
    activeThreadId = branched.id;
    await seedTopicEmbedding(activeThreadId, text);
  }

  // 3) Save user message
  await appendMessage({ threadId: activeThreadId, role: "user", content: text });

  // 4) Build context (system + recent)
  const { system, recent } = await buildPromptContext({
    threadId: activeThreadId,
    options: { mode, researchOn, maxRecent: 10, maxSummaryChars: 1500 },
  });

  // 5) Call LLM
  const assistant = await callLLM(system, recent as any, text);

  // 6) Save assistant message
  await appendMessage({ threadId: activeThreadId, role: "assistant", content: assistant });

  // 7) Update running summary
  const lastUser = text;
  const updated = updateSummary(thread?.runningSummary ?? "", lastUser, assistant);
  await persistUpdatedSummary(activeThreadId, updated);

  return NextResponse.json({ ok: true, threadId: activeThreadId, text: assistant, outOfContext: decision });
}
