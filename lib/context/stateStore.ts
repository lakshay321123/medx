import { prisma } from "@/lib/prisma";
import { ConversationState, EMPTY_STATE } from "./state";

const SCOPE = "state";
const KEY = "conversation_state";

export async function loadState(threadId: string): Promise<ConversationState> {
  const rec = await prisma.memory.findUnique({
    where: { threadId_scope_key: { threadId, scope: SCOPE, key: KEY } },
  });
  if (!rec) return { ...EMPTY_STATE };
  try {
    return JSON.parse(rec.value) as ConversationState;
  } catch {
    return { ...EMPTY_STATE };
  }
}

export async function saveState(threadId: string, state: ConversationState) {
  const value = JSON.stringify(state);
  await prisma.memory.upsert({
    where: { threadId_scope_key: { threadId, scope: SCOPE, key: KEY } },
    create: { threadId, scope: SCOPE, key: KEY, value },
    update: { value },
  });
}
