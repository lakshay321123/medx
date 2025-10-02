import { create } from "zustand";
import { nanoid } from "nanoid";
import type { AppMode } from "@/lib/welcomeMessages";
import type { DraftMode } from "@/lib/chat/types";

export type PendingDraft = {
  mode: DraftMode;
  research?: boolean;
  text: string;
  attachments: File[];
};

export type ChatMessageMeta = {
  error?: boolean;
  route?: string;
  req?: unknown;
  headers?: Record<string, string>;
  retryMeta?: {
    mode: AppMode;
    research: boolean;
    text: string;
  };
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  ts: number;
} & ChatMessageMeta;

type Thread = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  isTemp?: boolean;
};

type ChatState = {
  currentId: string | null;
  threads: Record<string, Thread>;
  draft: PendingDraft;
  startNewThread: () => string;
  upsertThread: (t: Partial<Thread> & { id: string }) => void;
  addMessage: (m: Omit<ChatMessage, "id" | "ts"> & { id?: string }) => void;
  removeMessage: (id: string) => void;
  resetToEmpty: () => void;
  setDraft: (draft: PendingDraft) => void;
  setDraftText: (text: string) => void;
  addDraftAttachments: (files: File[]) => void;
  clearDraft: () => void;
  isStreaming: boolean;
  setStreaming: (streaming: boolean) => void;
  setStopHandler: (handler: (() => void) | null) => void;
  stopStream: () => void;
  stopHandler: (() => void) | null;
};

export function createDefaultDraft(): PendingDraft {
  return {
    mode: "wellness",
    research: false,
    text: "",
    attachments: [],
  };
}

const initialDraft = createDefaultDraft();

export const useChatStore = create<ChatState>((set, get) => ({
  currentId: null,
  threads: {},
  draft: initialDraft,
  isStreaming: false,
  stopHandler: null,

  startNewThread: () => {
    const id = `temp_${nanoid(8)}`;
    const now = Date.now();
    const t: Thread = { id, title: "New chat", createdAt: now, updatedAt: now, messages: [], isTemp: true };
    set(s => ({ currentId: id, threads: { ...s.threads, [id]: t }, draft: createDefaultDraft() }));
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
    const msg: ChatMessage = { id, ts: now, ...m };
    const title = thread.messages.length === 0 && m.role === "user"
      ? m.content.split(/\s+/).slice(0, 6).join(" ")
      : thread.title;
    const updated: Thread = { ...thread, title, messages: [...thread.messages, msg], updatedAt: now };
    set(s => ({ threads: { ...s.threads, [thread.id]: updated } }));
  },

  removeMessage: (id) => {
    set(s => {
      const { currentId } = s;
      if (currentId == null) return s;
      const thread = s.threads[currentId];
      if (!thread) return s;
      const messages = thread.messages.filter(message => message.id !== id);
      const updated: Thread = { ...thread, messages, updatedAt: Date.now() };
      return { ...s, threads: { ...s.threads, [thread.id]: updated } };
    });
  },

  resetToEmpty: () => set({ currentId: null, threads: {}, draft: createDefaultDraft() }),

  setDraft: (draft) => set({ draft }),

  setDraftText: (text) => {
    set(s => ({ draft: { ...s.draft, text } }));
  },

  addDraftAttachments: (files) => {
    if (files.length === 0) return;
    set(s => ({ draft: { ...s.draft, attachments: [...s.draft.attachments, ...files] } }));
  },

  clearDraft: () => set({ draft: createDefaultDraft() }),

  setStreaming: (streaming) => set({ isStreaming: streaming }),

  setStopHandler: (handler) => set({ stopHandler: handler }),

  stopStream: () => {
    const handler = get().stopHandler;
    if (handler) {
      try {
        handler();
      } catch {}
    }
    set({ isStreaming: false, stopHandler: null });
  },
}));

