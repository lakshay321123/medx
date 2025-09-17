import { prisma } from "@/lib/prisma";

export type MemScope =
  | "aidoc.pref"    // preferences (pref_test_time, pref_med_form, diet_type, budget, etc.)
  | "aidoc.fact"      // durable factual nuggets (statin intolerance, prior MI, etc.)
  | "aidoc.redflag"   // safety notes (e.g., chest pain at rest -> ER)
  | "aidoc.goal";     // longitudinal goals (e.g., LDL < 100 by 12 weeks)

export async function wasAskedOnce(userId: string, threadId: string, key: string) {
  return !!(await prisma.sessionFlag.findFirst({ where: { userId, threadId, key } }));
}

export async function markAsked(userId: string, threadId: string, key: string) {
  await prisma.sessionFlag.upsert({
    where: { userId_threadId_key: { userId, threadId, key } },
    create: { userId, threadId, key, value: "1" },
    update: { value: "1" },
  });
}

export async function getMemByThread(threadId: string) {
  if (!threadId) return { prefs:[], facts:[], redflags:[], goals:[] };
  const rows = await prisma.memory.findMany({ where: { threadId } });
  const pick = (scope: MemScope) => rows.filter(r => r.scope === scope).map(r => ({ key: r.key, value: r.value }));
  return {
    prefs: pick("aidoc.pref"),
    facts: pick("aidoc.fact"),
    redflags: pick("aidoc.redflag"),
    goals: pick("aidoc.goal"),
  };
}

export async function upsertMem(threadId: string, scope: MemScope, key: string, value: string) {
  await prisma.memory.upsert({
    where: { threadId_scope_key: { threadId, scope, key } },
    update: { value },
    create: { threadId, scope, key, value },
  });
}

export function memLookup(mem: {prefs:any[]}, key: string) {
  const hit = (mem?.prefs||[]).find((p:any)=>p.key===key);
  return hit?.value ?? null;
}
