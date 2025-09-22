import { create } from "zustand";
import { nanoid } from "nanoid";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  kind?: "text" | "image";
  content?: string;
  imageUrl?: string;
  pending?: boolean;
  ts: number;
};

type Thread = { id: string; title: string; createdAt: number; updatedAt: number; messages: ChatMessage[]; isTemp?: boolean };

type ChatState = {
  currentId: string | null;
  threads: Record<string, Thread>;
  startNewThread: () => string;
  upsertThread: (t: Partial<Thread> & { id: string }) => void;
  addMessage: (m: Omit<ChatMessage, "id" | "ts"> & { id?: string; ts?: number; createdAt?: number }) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
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
    const timestamp =
      typeof m.ts === "number"
        ? m.ts
        : typeof m.createdAt === "number"
        ? m.createdAt
        : Date.now();
    const { currentId, threads } = get();
    if (!currentId) return;
    const thread = threads[currentId];
    const kind = m.kind ?? (typeof m.content === "string" ? "text" : undefined);
    const msg: ChatMessage = {
      id,
      role: m.role,
      kind,
      content: m.content,
      imageUrl: m.imageUrl,
      pending: m.pending,
      ts: timestamp,
    };
    const baseTitle =
      thread.messages.length === 0 && m.role === "user" && typeof m.content === "string" && m.content.trim().length > 0
        ? m.content
        : thread.title;
    const title = typeof baseTitle === "string"
      ? baseTitle.split(/\s+/).slice(0, 6).join(" ")
      : thread.title;
    const updated: Thread = {
      ...thread,
      title,
      messages: [...thread.messages, msg],
      updatedAt: timestamp,
    };
    set(s => ({ threads: { ...s.threads, [thread.id]: updated } }));
  },

  updateMessage: (id, updates) => {
    if (!id) return;
    set(s => {
      const { currentId } = s;
      if (!currentId) return s;
      const thread = s.threads[currentId];
      if (!thread) return s;
      let changed = false;
      const messages = thread.messages.map(msg => {
        if (msg.id !== id) return msg;
        changed = true;
        return { ...msg, ...updates };
      });
      if (!changed) return s;
      return {
        ...s,
        threads: {
          ...s.threads,
          [thread.id]: {
            ...thread,
            messages,
            updatedAt: Date.now(),
          },
        },
      };
    });
  },

  resetToEmpty: () => set({ currentId: null, threads: {} }),
}));

