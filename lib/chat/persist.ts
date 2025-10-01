import { createThreadIfNeeded } from "@/lib/chat/threadClient";
import { useChatStore } from "@/lib/state/chatStore";

const persistLocks = new Map<string, Promise<void>>();

export async function persistIfTemp({ title }: { title: string }): Promise<void> {
  const { currentId } = useChatStore.getState();
  const key = currentId ?? "draft";
  const existing = persistLocks.get(key);
  if (existing) {
    await existing;
    return;
  }

  const run = (async () => {
    const state = useChatStore.getState();
    const { draft, threads } = state;
    const threadId = state.currentId;
    const thread = threadId ? threads[threadId] : undefined;

    if (!thread) {
      return;
    }

    const resolvedId = await createThreadIfNeeded({
      threadId: thread.isTemp ? null : threadId,
      mode: draft.mode,
      research: draft.research,
      titleHint: title,
    });

    if (!threadId) {
      return;
    }

    if (resolvedId !== threadId) {
      const latest = useChatStore.getState();
      const latestThread = latest.threads[threadId];
      if (!latestThread) {
        return;
      }
      const nextThread = { ...latestThread, id: resolvedId, isTemp: false };
      useChatStore.setState(s => {
        const nextThreads = { ...s.threads };
        delete nextThreads[threadId];
        nextThreads[resolvedId] = nextThread;
        return { ...s, currentId: resolvedId, threads: nextThreads };
      });
    } else if (thread.isTemp) {
      useChatStore.setState(s => ({
        ...s,
        threads: {
          ...s.threads,
          [threadId]: { ...s.threads[threadId], isTemp: false },
        },
      }));
    }

    useChatStore.getState().upsertThread({ id: resolvedId, isTemp: false });
  })();

  persistLocks.set(key, run);
  try {
    await run;
  } finally {
    persistLocks.delete(key);
  }
}

