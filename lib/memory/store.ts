import { prisma } from "@/lib/prisma";
import { embed } from "./embeddings";

export async function appendMessage(opts: {
  threadId: string,
  role: "user" | "assistant" | "system",
  content: string
}) {
  const vector = await embed(opts.content);
  return prisma.message.create({
    data: {
      threadId: opts.threadId,
      role: opts.role,
      content: opts.content,
      embedding: Buffer.from(new Float32Array(vector).buffer),
    },
  });
}

export async function getRecentMessages(threadId: string, limit = 10) {
  const recent = await prisma.message.findMany({
    where: { threadId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return recent.reverse();
}

export async function getThread(threadId: string) {
  return prisma.chatThread.findUnique({
    where: { id: threadId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
      memories: true,
    },
  });
}

export async function upsertProfileMemory(threadId: string, key: string, value: string) {
  const v = await embed(`${key}: ${value}`);
  return prisma.memory.upsert({
    where: { threadId_scope_key: { threadId, scope: "profile", key } },
    create: {
      threadId, scope: "profile", key, value,
      embedding: Buffer.from(new Float32Array(v).buffer),
    },
    update: {
      value,
      embedding: Buffer.from(new Float32Array(v).buffer),
    },
  });
}

export async function setRunningSummary(threadId: string, text: string) {
  return prisma.chatThread.update({
    where: { id: threadId },
    data: { runningSummary: text },
  });
}
