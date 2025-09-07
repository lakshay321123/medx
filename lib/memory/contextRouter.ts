import { prisma } from "@/lib/prisma";
import { embed, cosine } from "./embeddings";

// Tune these if needed
const HARD_CONTINUE = 0.70;  // very confident continue
const CLARIFY_MIN   = 0.45;  // candidate for clarify
const NEW_THREAD_MAX= 0.30;  // clearly new topic
const RECENCY_HALFLIFE_HRS = 72; // recency de-weights older threads
const KEYWORD_BOOST = 0.08;  // boost if query/thread topic shares domain keywords

const DOMAIN_KEYWORDS: Record<string,string[]> = {
  health: ["bmi","diet","protein","calorie","workout","exercise","weight","height","food","meal","nutrition","fat loss","muscle"],
  oncology: ["nsclc","trial","oncology","chemo","immunotherapy","gene","egfr","alk","kras","phase","recruiting","completed"],
  general: []
};

function recencyWeight(updatedAt: Date) {
  const ageHrs = (Date.now() - updatedAt.getTime()) / 36e5;
  const w = Math.pow(0.5, ageHrs / RECENCY_HALFLIFE_HRS);
  return Math.max(0.3, Math.min(1, w)); // clamp to [0.3, 1]
}

function keywordBoost(q: string, title: string) {
  const L = (s: string) => s.toLowerCase();
  const text = `${L(q)} ${L(title)}`;
  let boost = 0;
  for (const group of Object.values(DOMAIN_KEYWORDS)) {
    if (group.some(k => text.includes(k))) { boost += KEYWORD_BOOST; break; }
  }
  return boost;
}

export type ContextDecision =
  | { action: "continue"; threadId: string; similarity: number }
  | { action: "clarify"; candidates: { threadId: string; title: string; similarity: number }[] }
  | { action: "newThread" };

export async function decideContext(userId: string, activeThreadId: string, query: string): Promise<ContextDecision> {
  const threads = await prisma.chatThread.findMany({
    where: { userId },
    select: { id: true, title: true, topicEmbedding: true, updatedAt: true },
    orderBy: { updatedAt: "desc" }
  });
  if (!threads.length) return { action: "newThread" };

  const qVec = await embed(query);
  const scored = threads
    .filter(t => t.topicEmbedding)
    .map(t => {
      const vec = Array.from(new Float32Array(t.topicEmbedding!.buffer));
      let sim = cosine(qVec, vec);
      sim = sim * recencyWeight(t.updatedAt) + keywordBoost(query, t.title ?? "");
      return { threadId: t.id, title: t.title ?? "Untitled", similarity: sim };
    })
    .sort((a,b)=> b.similarity - a.similarity);

  if (!scored.length) return { action: "newThread" };

  const best = scored[0];

  if (best.similarity >= HARD_CONTINUE) {
    return { action: "continue", threadId: best.threadId, similarity: best.similarity };
  }

  const clarify = scored.filter(s => s.similarity >= CLARIFY_MIN).slice(0, 3);
  if (clarify.length > 1) {
    return { action: "clarify", candidates: clarify };
  }

  if (best.similarity <= NEW_THREAD_MAX) {
    return { action: "newThread" };
  }

  // fallback: continue with the best (slightly unsure but better than cold-start)
  return { action: "continue", threadId: best.threadId, similarity: best.similarity };
}

