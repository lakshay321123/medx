import { supabaseAdmin } from "@/lib/supabase/admin";

export async function saveThread(userId: string, threadId: string, title: string, mode: string) {
  // chat_threads.id is uuid type — validate format
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(threadId)) return; // skip non-uuid thread IDs
  const sb = supabaseAdmin();
  await sb.from("chat_threads").upsert(
    { id: threadId, user_id: userId, title: title.slice(0, 200), mode, updated_at: new Date().toISOString() },
    { onConflict: "id" }
  );
}

export async function saveMessage(threadId: string, role: string, content: string) {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(threadId)) return;
  const sb = supabaseAdmin();
  const tokens = Math.ceil(content.length / 4); // rough estimate
  await sb.from("chat_messages").insert({
    thread_id: threadId,
    role,
    content: { text: content },
    tokens,
  });
}

export async function loadThreadMessages(threadId: string): Promise<{ role: string; content: string }[]> {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("chat_messages")
    .select("role, content")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(100);
  
  return (data || []).map((m: any) => ({
    role: m.role,
    content: typeof m.content === "string" ? m.content : m.content?.text || "",
  }));
}
