import { db } from "@/lib/db";

export type MemScope =
  | "aidoc.pref"
  | "aidoc.fact"
  | "aidoc.redflag"
  | "aidoc.goal";

function threadKey(scope: string, key: string) {
  return `${scope}:${key}`;
}

export async function wasAskedOnce(userId: string, threadId: string, key: string) {
  const supabase = db();
  const k = threadKey("aidoc.flag", key);

  const { data, error } = await supabase
    .from("medx_memory")
    .select("id")
    .eq("user_id", userId)
    .eq("scope", "thread")
    .eq("thread_id", threadId)
    .eq("key", k)
    .limit(1);

  if (error) return false;
  return (data ?? []).length > 0;
}

export async function markAsked(userId: string, threadId: string, key: string) {
  const supabase = db();
  const k = threadKey("aidoc.flag", key);

  await supabase.from("medx_memory").upsert(
    {
      user_id: userId,
      scope: "thread",
      thread_id: threadId,
      key: k,
      value: { v: true },
    },
    { onConflict: "user_id,scope,thread_id,key" }
  );
}

export async function getMemByThread(userId: string, threadId: string) {
  if (!threadId) return { prefs: [], facts: [], redflags: [], goals: [] };

  const supabase = db();
  const { data } = await supabase
    .from("medx_memory")
    .select("key,value")
    .eq("user_id", userId)
    .eq("scope", "thread")
    .eq("thread_id", threadId);

  const rows = data ?? [];
  const pick = (scope: MemScope) =>
    rows
      .filter((r) => (r.key ?? "").startsWith(scope + ":"))
      .map((r) => ({
        key: (r.key ?? "").slice(scope.length + 1),
        value: (r.value as any)?.v ?? r.value,
      }));

  return {
    prefs: pick("aidoc.pref"),
    facts: pick("aidoc.fact"),
    redflags: pick("aidoc.redflag"),
    goals: pick("aidoc.goal"),
  };
}

export async function upsertMem(userId: string, threadId: string, scope: MemScope, key: string, value: string) {
  const supabase = db();
  const k = threadKey(scope, key);

  await supabase.from("medx_memory").upsert(
    {
      user_id: userId,
      scope: "thread",
      thread_id: threadId,
      key: k,
      value: { v: value },
    },
    { onConflict: "user_id,scope,thread_id,key" }
  );
}

export function memLookup(mem: { prefs: any[] }, key: string) {
  const hit = (mem?.prefs || []).find((p: any) => p.key === key);
  return hit?.value ?? null;
}
