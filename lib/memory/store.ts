import { db } from "@/lib/db";
import { getUserId } from "@/lib/getUserId";

export async function appendMessage(opts: {
  threadId: string;
  role: "user" | "assistant" | "system";
  content: string;
}) {
  const userId = await getUserId();
  if (!userId) throw new Error("unauthorized");

  const sb = db();
  const { error } = await sb.from("chat_messages").insert({
    user_id: userId,
    thread_id: opts.threadId,
    role: opts.role,
    content: { text: opts.content },
  });
  if (error) throw error;

  await sb
    .from("chat_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", opts.threadId)
    .eq("user_id", userId);
}

export async function getRecentMessages(threadId: string, limit = 10) {
  const userId = await getUserId();
  if (!userId) return [];

  const sb = db();
  const { data, error } = await sb
    .from("chat_messages")
    .select("role,content,created_at")
    .eq("user_id", userId)
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []).reverse().map((m: any) => ({
    role: m.role,
    content: typeof m.content === "string" ? m.content : (m.content?.text ?? ""),
    createdAt: m.created_at,
  }));
}

export async function upsertProfileMemory(threadId: string, key: string, value: string) {
  const userId = await getUserId();
  if (!userId) throw new Error("unauthorized");

  const normalizedKey = key.trim().toLowerCase();
  const normalizedValue = value.trim();

  const sb = db();
  await sb.from("medx_memory").upsert(
    {
      user_id: userId,
      scope: "thread",
      thread_id: threadId,
      key: `profile:${normalizedKey}`,
      value: { v: normalizedValue },
    },
    { onConflict: "user_id,scope,thread_id,key" }
  );
}

export async function setRunningSummary(threadId: string, text: string) {
  const userId = await getUserId();
  if (!userId) throw new Error("unauthorized");

  const sb = db();
  await sb.from("medx_memory").upsert(
    {
      user_id: userId,
      scope: "thread",
      thread_id: threadId,
      key: "running_summary",
      value: { v: text },
    },
    { onConflict: "user_id,scope,thread_id,key" }
  );
}
