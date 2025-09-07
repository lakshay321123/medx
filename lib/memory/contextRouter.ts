import { prisma } from "@/lib/prisma";
import { embed, cosine } from "./embeddings";

export type ContextDecision =
  | { action: "continue"; threadId: string; similarity: number }
  | { action: "clarify"; candidates: { threadId: string; title: string; similarity: number }[] }
  | { action: "newThread" };

const SIM_THRESHOLD = 0.35;  // below → new thread
const CLARIFY_RANGE = 0.45;  // medium → ask user

export async function decideContext(
  userId: string,
  activeThreadId: string,
  query: string
): Promise<ContextDecision> {
  const threads = await prisma.chatThread.findMany({
    where: { userId },
    select: { id: true, title: true, topicEmbedding: true },
    orderBy: { updatedAt: "desc" },
  });

  if (!threads.length) return { action: "newThread" };

  const qVec = await embed(query);
  const sims = threads
    .filter((t) => t.topicEmbedding)
    .map((t) => {
      const vec = Array.from(new Float32Array(t.topicEmbedding!.buffer));
      return {
        threadId: t.id,
        title: t.title ?? "Untitled",
        similarity: cosine(qVec, vec),
      };
    })
    .sort((a, b) => b.similarity - a.similarity);

  if (!sims.length) return { action: "newThread" };

  // Best match
  const best = sims[0];
  if (best.similarity >= 0.65) {
    return { action: "continue", threadId: best.threadId, similarity: best.similarity };
  }

  if (best.similarity < SIM_THRESHOLD) {
    return { action: "newThread" };
  }

  // Multiple close matches → clarify
  const candidates = sims.filter((s) => s.similarity >= CLARIFY_RANGE).slice(0, 3);
  if (candidates.length > 1) {
    return { action: "clarify", candidates };
  }

  // Otherwise → new thread
  return { action: "newThread" };
}
