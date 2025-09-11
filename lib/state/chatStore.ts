import { create } from "zustand";
import { nanoid } from "nanoid";

type Msg = { id: string; role: "user"|"assistant"|"system"; content: string; ts: number };
type Thread = { id: string; title: string; createdAt: number; updatedAt: number; messages: Msg[]; isTemp?: boolean };

type ChatState = {
  currentId: string | null;
  threads: Record<string, Thread>;
  startNewThread: () => string;
  upsertThread: (t: Partial<Thread> & { id: string }) => void;
  addMessage: (m: Omit<Msg,"id"|"ts"> & { id?: string }) => void;
  resetToEmpty: () => void;
};

export const useChatStore = create<ChatState>((set, get) => ({
  currentId: null,
  threads: {},

  startNewThread: () => {
    const id = `temp_${nanoid(8)}`;
    const now = Date.now();
    const t: Thread = { id, title: "New chat", createdAt: now, updatedAt: now, messages: [], isTemp: true };
    set(s => ({ currentId: id, threads: { ...s.threads, [id]: t } }));
    return id;
  },

  upsertThread: (t) => {
    set(s => {
      const prev = s.threads[t.id] ?? { id: t.id, title: "New chat", createdAt: Date.now(), updatedAt: Date.now(), messages: [] };
      const merged = { ...prev, ...t, updatedAt: Date.now() };
      return { ...s, threads: { ...s.threads, [t.id]: merged } };
    });
  },

  addMessage: (m) => {
    const id = m.id ?? nanoid(10);
    const now = Date.now();
    const { currentId, threads } = get();
    if (!currentId) return;
    const thread = threads[currentId];
    const msg: Msg = { id, ts: now, ...m };
    const title = thread.messages.length === 0 && m.role === "user"
      ? m.content.split(/\s+/).slice(0, 6).join(" ")
      : thread.title;
    const updated: Thread = { ...thread, title, messages: [...thread.messages, msg], updatedAt: now };
    set(s => ({ threads: { ...s.threads, [thread.id]: updated } }));
  },

  resetToEmpty: () => set({ currentId: null, threads: {} }),
}));

