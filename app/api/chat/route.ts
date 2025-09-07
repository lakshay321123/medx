import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appendMessage } from "@/lib/memory/store";
import { decideContext } from "@/lib/memory/contextRouter";
import { seedTopicEmbedding } from "@/lib/memory/outOfContext";
import { updateSummary, persistUpdatedSummary } from "@/lib/memory/summary";
import { buildPromptContext } from "@/lib/memory/contextBuilder";

// Replace with real LLM
async function callLLM(system: string, recent: { role: string; content: string }[], userText: string) {
  return `Demo: I understood "${userText}" in context.`;
}

export async function POST(req: Request) {
  const { userId, activeThreadId, text, mode, researchOn } = await req.json();

  // Context routing
  const decision = await decideContext(userId, activeThreadId, text);
  let threadId = activeThreadId;

  if (decision.action === "continue") {
    threadId = decision.threadId;
  } else if (decision.action === "newThread") {
    const newT = await prisma.chatThread.create({
      data: { userId, title: "New topic" },
    });
    threadId = newT.id;
    await seedTopicEmbedding(newT.id, text);
  } else if (decision.action === "clarify") {
    return NextResponse.json({
      ok: true,
      clarify: true,
      options: decision.candidates,
    });
  }

  // Save user message
  await appendMessage({ threadId, role: "user", content: text });

  // Build context
  const { system, recent } = await buildPromptContext({
    threadId,
    options: { mode, researchOn },
  });

  // Call LLM
  const assistant = await callLLM(system, recent as any, text);

  // Save assistant
  await appendMessage({ threadId, role: "assistant", content: assistant });

  // Update running summary
  const updated = updateSummary("", text, assistant);
  await persistUpdatedSummary(threadId, updated);

  return NextResponse.json({ ok: true, threadId, text: assistant });
}
