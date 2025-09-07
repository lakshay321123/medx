import { prisma } from "@/lib/prisma";
import { embed, cosine } from "./embeddings";
import type { OutOfContextDecision } from "@/types/memory";

const SIM_THRESHOLD = 0.35; // tune: 0.3..0.5

export async function decideOutOfContext(threadId: string, userText: string): Promise<OutOfContextDecision> {
  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: 8 }, // last 8
    },
  });
  if (!thread) return { isOutOfContext: false };

  const topicEmbedding = thread.topicEmbedding?.buffer ? new Float32Array(thread.topicEmbedding.buffer) : null;

  // Compare to running topic if exists; else to last assistant/user combo
  const recent = thread.messages
    .filter(m => m.role !== "system")
    .slice(0, 4) // most recent 4 for signal
    .reverse();

  const userVec = await embed(userText);

  let sims: number[] = [];
  if (topicEmbedding) {
    sims.push(cosine(Array.from(userVec), Array.from(topicEmbedding)));
  }
  for (const m of recent) {
    if (!m.embedding) continue;
    const msgVec = Array.from(new Float32Array(m.embedding.buffer));
    sims.push(cosine(userVec, msgVec));
  }

  const best = sims.length ? Math.max(...sims) : 1; // if no data, do not split
  return { isOutOfContext: best < SIM_THRESHOLD, similarity: best };
}

export async function seedTopicEmbedding(threadId: string, text: string) {
  const v = await embed(text);
  await prisma.chatThread.update({
    where: { id: threadId },
    data: { topicEmbedding: Buffer.from(new Float32Array(v).buffer) },
  });
}
