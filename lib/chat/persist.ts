import { useChatStore } from "@/lib/state/chatStore";
import { createThreadIfNeeded } from "@/lib/chat/threadClient";

export async function persistIfTemp() {
  const { currentId, threads } = useChatStore.getState();
  if (!currentId) return;
  const t = threads[currentId];
  if (!t?.isTemp) return;
  const newId = await createThreadIfNeeded({
    mode: "wellness",
    research: undefined,
    titleHint: t.title,
  });
  if (newId && newId !== currentId) {
    const nextThreads = { ...threads };
    delete nextThreads[currentId];
    nextThreads[newId] = { ...t, id: newId, isTemp: false };
    useChatStore.setState({ currentId: newId, threads: nextThreads });
    return;
  }
  useChatStore.getState().upsertThread({ id: currentId, isTemp: false });
}

