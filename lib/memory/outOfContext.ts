import { prisma } from "@/lib/prisma";
import { embed, cosine } from "./embeddings";
import type { OutOfContextDecision } from "@/types/memory";

const HEALTH_KEYWORDS = [
  "bmi", "weight", "height", "diet", "protein",
  "calorie", "exercise", "workout", "meal", "food", "nutrition"
];

export async function decideOutOfContext(threadId: string, userText: string): Promise<OutOfContextDecision> {
  const lower = userText.toLowerCase();

  // Health-related? Always stick in same thread
  if (HEALTH_KEYWORDS.some(k => lower.includes(k))) {
    return { isOutOfContext: false, reason: "Health keyword detected" };
  }

  // Else → fall back to embeddings
  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 8 } },
  });
  if (!thread) return { isOutOfContext: false };

  const userVec = await embed(userText);
  let sims: number[] = [];

  for (const m of thread.messages) {
    if (!m.embedding) continue;
    const msgVec = Array.from(new Float32Array(m.embedding.buffer));
    sims.push(cosine(userVec, msgVec));
  }

  const best = sims.length ? Math.max(...sims) : 1;
  return { isOutOfContext: best < 0.35, similarity: best };
}

export async function seedTopicEmbedding(threadId: string, text: string) {
  const v = await embed(text);
  await prisma.chatThread.update({
    where: { id: threadId },
    data: { topicEmbedding: Buffer.from(new Float32Array(v).buffer) },
  });
}
