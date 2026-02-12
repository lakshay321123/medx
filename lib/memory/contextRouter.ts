import { db } from "@/lib/db";

export type ContextDecision =
  | { action: "continue"; threadId: string; similarity: number }
  | { action: "clarify"; candidates: { threadId: string; title: string; similarity: number }[] }
  | { action: "newThread" };

export async function decideContext(userId: string, activeThreadId: string, _query: string): Promise<ContextDecision> {
  const sb = db();
  const { data } = await sb
    .from("chat_threads")
    .select("id,title,updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(20);

  const threads = data ?? [];
  if (!threads.length) return { action: "newThread" };

  if (activeThreadId && threads.some((t: any) => t.id === activeThreadId)) {
    return { action: "continue", threadId: activeThreadId, similarity: 1 };
  }

  const latest: any = threads[0];
  return { action: "continue", threadId: latest.id, similarity: 0.6 };
}
