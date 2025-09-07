import { prisma } from "@/lib/prisma";

type Scope = "aidoc.pref" | "aidoc.fact" | "aidoc.redflag" | "aidoc.embedding";

export async function getAiDocMem(threadId: string) {
  const rows = await prisma.memory.findMany({ where: { threadId } });
  const byScope = (s: Scope) => rows.filter(r => r.scope === s);
  return {
    prefs: byScope("aidoc.pref").map(r => ({ key: r.key, value: r.value })),
    facts: byScope("aidoc.fact").map(r => ({ key: r.key, value: r.value })),
    redflags: byScope("aidoc.redflag").map(r => ({ key: r.key, value: r.value })),
  };
}

export async function upsertMem(threadId: string, scope: Scope, key: string, value: string) {
  await prisma.memory.upsert({
    where: { threadId_scope_key: { threadId, scope, key } },
    update: { value },
    create: { threadId, scope, key, value },
  });
}

