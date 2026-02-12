import { db } from "@/lib/db";
import { getUserId } from "@/lib/getUserId";
import { ConversationState, EMPTY_STATE } from "./state";

const KEY = "state:conversation_state";

export async function loadState(threadId: string): Promise<ConversationState> {
  const userId = await getUserId();
  if (!userId) return { ...EMPTY_STATE };

  const sb = db();
  const { data } = await sb
    .from("medx_memory")
    .select("value")
    .eq("user_id", userId)
    .eq("scope", "thread")
    .eq("thread_id", threadId)
    .eq("key", KEY)
    .maybeSingle();

  const v: any = data?.value;
  if (!v) return { ...EMPTY_STATE };
  return (v?.state ?? v) as ConversationState;
}

export async function saveState(threadId: string, state: ConversationState) {
  const userId = await getUserId();
  if (!userId) return;

  const sb = db();
  await sb.from("medx_memory").upsert(
    {
      user_id: userId,
      scope: "thread",
      thread_id: threadId,
      key: KEY,
      value: { state },
    },
    { onConflict: "user_id,scope,thread_id,key" }
  );
}
