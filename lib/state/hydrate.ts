import { useChatStore } from "./chatStore";

export function hydrateFromLocalStorage(threadId?: string) {
  if (!threadId) return; // do not hydrate on root chat
  try {
    const raw = localStorage.getItem(`thread:${threadId}`);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    useChatStore.getState().upsertThread({ id: threadId, ...parsed, isTemp: false });
  } catch {}
}

