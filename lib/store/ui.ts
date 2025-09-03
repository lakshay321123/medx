"use client";
import { create } from "zustand";

type Message = { id: string; role: "user"|"assistant"; content: string; ts: number };

type ThreadState = {
  messages: Message[];
  topic?: string;
  updatedAt?: number;
};

type UIState = {
  // key = threadId
  threads: Record<string, ThreadState>;
  activeThreadId: string | null;
  panel: "chat" | "profile" | "timeline" | "alerts" | "settings";

  setPanel: (p: UIState["panel"]) => void;
  setActiveThread: (id: string) => void;

  addMessage: (threadId: string, m: Message) => void;
  setTopic: (threadId: string, topic: string) => void;

  hydrate: () => void;
};

const STORAGE_KEY = "medx:v1:ui";

export const useUI = create<UIState>((set, get) => ({
  threads: {},
  activeThreadId: null,
  panel: "chat",

  setPanel: (p) => {
    set({ panel: p });
    // persist lightweight UI bits
    const snapshot = { ...get(), threads: undefined as any };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ panel: snapshot.panel, activeThreadId: snapshot.activeThreadId })); } catch {}
  },

  setActiveThread: (id) => {
    const { threads } = get();
    if (!threads[id]) threads[id] = { messages: [], updatedAt: Date.now() };
    set({ activeThreadId: id, threads: { ...threads } });
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...s, activeThreadId: id }));
    } catch {}
  },

  addMessage: (threadId, m) => {
    const { threads } = get();
    const t = threads[threadId] ?? { messages: [], updatedAt: 0 };
    const next = { ...t, messages: [...t.messages, m], updatedAt: Date.now() };
    const merged = { ...threads, [threadId]: next };
    set({ threads: merged });

    // persist full thread to per-thread key to keep localStorage small per thread
    try { localStorage.setItem(`${STORAGE_KEY}:thread:${threadId}`, JSON.stringify(next)); } catch {}
  },

  setTopic: (threadId, topic) => {
    const { threads } = get();
    const t = threads[threadId] ?? { messages: [], updatedAt: 0 };
    const next = { ...t, topic, updatedAt: Date.now() };
    set({ threads: { ...threads, [threadId]: next } });
    try { localStorage.setItem(`${STORAGE_KEY}:thread:${threadId}`, JSON.stringify(next)); } catch {}
  },

  hydrate: () => {
    try {
      const base = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const panel = base.panel ?? "chat";
      const activeThreadId = base.activeThreadId ?? null;

      const threads: Record<string, ThreadState> = {};
      if (activeThreadId) {
        const raw = localStorage.getItem(`${STORAGE_KEY}:thread:${activeThreadId}`);
        if (raw) threads[activeThreadId] = JSON.parse(raw);
      }
      set({ panel, activeThreadId, threads });
    } catch {}
  }
}));
