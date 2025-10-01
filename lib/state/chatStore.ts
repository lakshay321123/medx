import { create } from "zustand";
import { nanoid } from "nanoid";
import type { AppMode } from "@/lib/welcomeMessages";
import { persist as p } from "@/lib/utils/persist";

export type MsgStatus = "assistant-partial" | "assistant-final" | "assistant-error";

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
  chatId?: string;
  role: "user" | "assistant" | "system";
  content: string;
  ts: number;
  status?: MsgStatus;
  createdAt?: number;
  updatedAt?: number;
  streamCursor?: number;
  parentId?: string;
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
  startNewThread: () => string;
  upsertThread: (t: Partial<Thread> & { id: string }) => void;
  addMessage: (m: Omit<ChatMessage, "id" | "ts"> & { id?: string }) => void;
  removeMessage: (id: string) => void;
  resetToEmpty: () => void;
  appendChunk: (chatId: string, messageId: string, chunk: string) => void;
  finalize: (chatId: string, messageId: string) => void;
  markErrorKeepText: (chatId: string, messageId: string) => void;
  hydratePartials: (chatId: string, msgs: ChatMessage[]) => void;
};

const throttleMap: Record<string, number> = {};
const THROTTLE_MS = 200;

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
    const existingIndex = thread.messages.findIndex(message => message.id === id);
    const prevMessage = existingIndex >= 0 ? thread.messages[existingIndex] : null;
    const messageCreatedAt = prevMessage?.createdAt ?? m.createdAt ?? now;
    const msg: ChatMessage = {
      id,
      ts: prevMessage?.ts ?? now,
      chatId: currentId,
      createdAt: messageCreatedAt,
      updatedAt: now,
      streamCursor: m.streamCursor ?? prevMessage?.streamCursor ?? (typeof m.content === "string" ? m.content.length : 0),
      status: m.status ?? prevMessage?.status,
      parentId: m.parentId ?? prevMessage?.parentId,
      role: m.role,
      content: m.content,
      error: m.error ?? prevMessage?.error,
      route: m.route ?? prevMessage?.route,
      req: m.req ?? prevMessage?.req,
      headers: m.headers ?? prevMessage?.headers,
      retryMeta: m.retryMeta ?? prevMessage?.retryMeta,
    };
    const baseContent = typeof m.content === "string" ? m.content : "";
    const title = thread.messages.length === 0 && m.role === "user"
      ? baseContent.split(/\s+/).slice(0, 6).join(" ")
      : thread.title;
    const messages = existingIndex >= 0
      ? thread.messages.map((message, index) => (index === existingIndex ? msg : message))
      : [...thread.messages, msg];
    const updated: Thread = { ...thread, title, messages, updatedAt: now };
    set(s => ({ threads: { ...s.threads, [thread.id]: updated } }));
  },

  removeMessage: (id) => {
    set(s => {
      const { currentId } = s;
      if (!currentId) return s;
      const thread = s.threads[currentId];
      if (!thread) return s;
      const messages = thread.messages.filter(message => message.id !== id);
      const updated: Thread = { ...thread, messages, updatedAt: Date.now() };
      return { ...s, threads: { ...s.threads, [thread.id]: updated } };
    });
    const { currentId } = get();
    if (typeof window !== "undefined" && currentId) {
      void p.remove(currentId, id);
    }
    delete throttleMap[id];
  },

  resetToEmpty: () => set({ currentId: null, threads: {} }),

  appendChunk: (chatId, messageId, chunk) => {
    if (!chunk) return;
    const now = Date.now();
    let updatedMessage: ChatMessage | null = null;
    set(state => {
      const thread = state.threads[chatId];
      if (!thread) {
        return state;
      }
      const index = thread.messages.findIndex(message => message.id === messageId);
      const baseNow = now;
      const existing = index >= 0 ? thread.messages[index] : null;
      const message: ChatMessage = {
        id: messageId,
        role: "assistant",
        content: (existing?.content ?? "") + chunk,
        ts: existing?.ts ?? baseNow,
        chatId,
        status: existing?.status ?? "assistant-partial",
        createdAt: existing?.createdAt ?? baseNow,
        updatedAt: baseNow,
        streamCursor: (existing?.streamCursor ?? 0) + chunk.length,
        parentId: existing?.parentId,
        error: existing?.error,
        route: existing?.route,
        req: existing?.req,
        headers: existing?.headers,
        retryMeta: existing?.retryMeta,
      };
      const messages = index >= 0
        ? thread.messages.map((m, i) => (i === index ? message : m))
        : [...thread.messages, message];
      updatedMessage = message;
      const updatedThread: Thread = { ...thread, messages, updatedAt: baseNow };
      return { ...state, threads: { ...state.threads, [chatId]: updatedThread } };
    });
    if (!updatedMessage) {
      return;
    }
    if (typeof window !== "undefined") {
      const previous = throttleMap[messageId] ?? 0;
      if (!previous || now - previous > THROTTLE_MS) {
        throttleMap[messageId] = now;
        void p.save(chatId, updatedMessage);
      }
    }
  },

  finalize: (chatId, messageId) => {
    let updatedMessage: ChatMessage | null = null;
    set(state => {
      const thread = state.threads[chatId];
      if (!thread) {
        return state;
      }
      const messages = thread.messages.map(message => {
        if (message.id !== messageId) return message;
        const next: ChatMessage = {
          ...message,
          status: "assistant-final",
          updatedAt: Date.now(),
        };
        updatedMessage = next;
        return next;
      });
      if (!updatedMessage) {
        return state;
      }
      const updatedThread: Thread = { ...thread, messages, updatedAt: Date.now() };
      return { ...state, threads: { ...state.threads, [chatId]: updatedThread } };
    });
    if (updatedMessage && typeof window !== "undefined") {
      void p.save(chatId, updatedMessage);
    }
    delete throttleMap[messageId];
  },

  markErrorKeepText: (chatId, messageId) => {
    let updatedMessage: ChatMessage | null = null;
    set(state => {
      const thread = state.threads[chatId];
      if (!thread) {
        return state;
      }
      const messages = thread.messages.map(message => {
        if (message.id !== messageId) return message;
        const next: ChatMessage = {
          ...message,
          status: "assistant-partial",
          updatedAt: Date.now(),
        };
        updatedMessage = next;
        return next;
      });
      if (!updatedMessage) {
        return state;
      }
      const updatedThread: Thread = { ...thread, messages, updatedAt: Date.now() };
      return { ...state, threads: { ...state.threads, [chatId]: updatedThread } };
    });
    if (updatedMessage && typeof window !== "undefined") {
      void p.save(chatId, updatedMessage);
    }
  },

  hydratePartials: (chatId, msgs) => {
    if (!Array.isArray(msgs) || msgs.length === 0) return;
    set(state => {
      const now = Date.now();
      const thread = state.threads[chatId] ?? {
        id: chatId,
        title: "New chat",
        createdAt: now,
        updatedAt: now,
        messages: [],
      };
      const existingMessages = new Map(thread.messages.map(m => [m.id, m] as const));
      for (const raw of msgs) {
        if (!raw || raw.role !== "assistant") continue;
        const prev = existingMessages.get(raw.id);
        const createdAt = raw.createdAt ?? prev?.createdAt ?? raw.ts ?? now;
        const merged: ChatMessage = {
          ...(prev ?? {}),
          ...(raw ?? {}),
          chatId,
          createdAt,
          updatedAt: raw.updatedAt ?? now,
          ts: raw.ts ?? prev?.ts ?? createdAt,
        };
        existingMessages.set(raw.id, merged);
      }
      const mergedMessages = Array.from(existingMessages.values()).sort((a, b) => {
        const aTime = a.createdAt ?? a.ts ?? 0;
        const bTime = b.createdAt ?? b.ts ?? 0;
        return aTime - bTime;
      });
      const updatedThread: Thread = {
        ...thread,
        messages: mergedMessages,
        updatedAt: Math.max(thread.updatedAt, now),
      };
      return {
        ...state,
        threads: { ...state.threads, [chatId]: updatedThread },
      };
    });
  },
}));

