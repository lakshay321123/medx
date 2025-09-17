import { supabaseAdmin } from "@/lib/supabase/admin";

export type MemScope =
  | "aidoc.pref"    // preferences (pref_test_time, pref_med_form, diet_type, budget, etc.)
  | "aidoc.fact"      // durable factual nuggets (statin intolerance, prior MI, etc.)
  | "aidoc.redflag"   // safety notes (e.g., chest pain at rest -> ER)
  | "aidoc.goal";     // longitudinal goals (e.g., LDL < 100 by 12 weeks)

const SESSION_SCOPE = "aidoc.session";

type ScopeBucket = {
  prefs: Array<{ key: string; value: any }>;
  facts: Array<{ key: string; value: any }>;
  redflags: Array<{ key: string; value: any }>;
  goals: Array<{ key: string; value: any }>;
};

function baseBuckets(): ScopeBucket {
  return { prefs: [], facts: [], redflags: [], goals: [] };
}

function encodeValue(scope: string, key: string, value: any) {
  return { mem_scope: scope, key, value };
}

async function findMemoryRow(params: {
  userId: string;
  scope: "global" | "thread";
  threadId?: string | null;
  key: string;
  memScope?: string;
}) {
  const db = supabaseAdmin();
  let builder = db
    .from("medx_memory")
    .select("id, value")
    .eq("user_id", params.userId)
    .eq("scope", params.scope)
    .eq("key", params.key)
    .limit(1);

  if (params.scope === "thread") {
    builder = builder.eq("thread_id", params.threadId ?? null);
  } else {
    builder = builder.is("thread_id", null);
  }

  if (params.memScope) {
    builder = builder.eq("value->>mem_scope", params.memScope);
  }

  const { data, error } = await builder.maybeSingle();
  if (error && error.code !== "PGRST116") throw error;
  return data ?? null;
}

export async function wasAskedOnce(userId: string, threadId: string, key: string) {
  if (!userId || !threadId || !key) return false;
  const row = await findMemoryRow({
    userId,
    scope: "thread",
    threadId,
    key,
    memScope: SESSION_SCOPE,
  });
  return !!row;
}

export async function markAsked(userId: string, threadId: string, key: string) {
  if (!userId || !threadId || !key) return;
  const db = supabaseAdmin();
  const scope = "thread" as const;
  const existing = await findMemoryRow({ userId, scope, threadId, key, memScope: SESSION_SCOPE });
  const payload = {
    user_id: userId,
    scope,
    thread_id: threadId,
    key,
    value: encodeValue(SESSION_SCOPE, key, "1"),
    source: "aidoc",
    confidence: 1,
    updated_at: new Date().toISOString(),
  };
  if (existing?.id) {
    await db
      .from("medx_memory")
      .update(payload)
      .eq("id", existing.id)
      .eq("user_id", userId);
  } else {
    await db.from("medx_memory").insert({ ...payload, created_at: new Date().toISOString() });
  }
}

export async function getMemByThread(userId: string, threadId?: string | null) {
  if (!userId) return baseBuckets();
  const db = supabaseAdmin();

  const [globalRes, threadRes] = await Promise.all([
    db
      .from("medx_memory")
      .select("key, value")
      .eq("user_id", userId)
      .eq("scope", "global")
      .is("thread_id", null)
      .order("updated_at", { ascending: false })
      .limit(200),
    threadId
      ? db
          .from("medx_memory")
          .select("key, value")
          .eq("user_id", userId)
          .eq("scope", "thread")
          .eq("thread_id", threadId)
          .order("updated_at", { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const buckets = baseBuckets();
  const rows = [
    ...(Array.isArray(globalRes.data) ? globalRes.data : []),
    ...(Array.isArray((threadRes as any).data) ? (threadRes as any).data : []),
  ];

  for (const row of rows) {
    const val: any = row?.value ?? {};
    const memScope = typeof val?.mem_scope === "string" ? (val.mem_scope as MemScope) : null;
    const memKey = (val && typeof val.key === "string") ? val.key : row.key;
    const memVal = val?.value ?? val;
    if (!memScope || !memKey) continue;
    if (memScope === "aidoc.pref") buckets.prefs.push({ key: memKey, value: memVal });
    else if (memScope === "aidoc.fact") buckets.facts.push({ key: memKey, value: memVal });
    else if (memScope === "aidoc.redflag") buckets.redflags.push({ key: memKey, value: memVal });
    else if (memScope === "aidoc.goal") buckets.goals.push({ key: memKey, value: memVal });
  }

  return buckets;
}

export async function upsertMem(
  userId: string,
  threadId: string | null | undefined,
  scope: MemScope,
  key: string,
  value: any
) {
  if (!userId || !key) return;
  const db = supabaseAdmin();
  const isThread = Boolean(threadId);
  const sbScope: "thread" | "global" = isThread ? "thread" : "global";
  const existing = await findMemoryRow({
    userId,
    scope: sbScope,
    threadId: isThread ? threadId : null,
    key,
    memScope: scope,
  });
  const payload = {
    user_id: userId,
    scope: sbScope,
    thread_id: isThread ? threadId : null,
    key,
    value: encodeValue(scope, key, value),
    source: "aidoc",
    confidence: 0.9,
    updated_at: new Date().toISOString(),
  };
  if (existing?.id) {
    await db
      .from("medx_memory")
      .update(payload)
      .eq("id", existing.id)
      .eq("user_id", userId);
  } else {
    await db
      .from("medx_memory")
      .insert({ ...payload, created_at: new Date().toISOString() });
  }
}

export function memLookup(mem: {prefs:any[]}, key: string) {
  const hit = (mem?.prefs||[]).find((p:any)=>p.key===key);
  return hit?.value ?? null;
}
