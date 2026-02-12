import { db } from "@/lib/db";
import { getUserId } from "@/lib/getUserId";
import type { OutOfContextDecision } from "@/types/memory";

const HEALTH_KEYWORDS = [
  "bmi", "weight", "height", "diet", "protein",
  "calorie", "exercise", "workout", "meal", "food", "nutrition"
];

export async function decideOutOfContext(_threadId: string, userText: string): Promise<OutOfContextDecision> {
  const lower = userText.toLowerCase();
  if (HEALTH_KEYWORDS.some((k) => lower.includes(k))) {
    return { isOutOfContext: false, reason: "Health keyword detected" };
  }
  return { isOutOfContext: false };
}

export async function seedTopicEmbedding(threadId: string, _text: string) {
  const userId = await getUserId();
  if (!userId) return;

  const sb = db();
  await sb
    .from("chat_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId)
    .eq("user_id", userId);
}
