import type { ProposedAction } from "./types";

type Pending = ProposedAction & { sourceMsgId: string };
const cache = new Map<string, Pending>(); // key = threadId

export function setPendingAction(threadId: string, sourceMsgId: string, pa?: ProposedAction) {
  if (!pa) return cache.delete(threadId);
  cache.set(threadId, { ...pa, sourceMsgId });
}

export function getPendingAction(threadId: string): Pending | null {
  const pa = cache.get(threadId);
  if (!pa) return null;
  if (pa.expiresAt && pa.expiresAt < Date.now()) {
    cache.delete(threadId);
    return null;
  }
  return pa;
}

export function clearPendingAction(threadId: string) {
  cache.delete(threadId);
}
