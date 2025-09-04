"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Msg = { id: string; role: "user" | "assistant"; content: string; ts: number };
type ChatState = {
  messages: Msg[];
  draft: string;
  addMessage: (m: Omit<Msg, "id" | "ts">) => void;
  setDraft: (v: string) => void;
  reset: () => void;
};

const ChatCtx = createContext<ChatState | null>(null);
const KEY = "medx.chat.v1";

export function ChatStateProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");

  // hydrate once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.messages)) setMessages(parsed.messages);
        if (typeof parsed?.draft === "string") setDraft(parsed.draft);
      }
    } catch {}
  }, []);

  // persist (debounced)
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify({ messages, draft }));
      } catch {}
    }, 400);
    return () => clearTimeout(id);
  }, [messages, draft]);

  const addMessage = (m: Omit<Msg, "id" | "ts">) =>
    setMessages((prev) => [...prev, { ...m, id: crypto.randomUUID(), ts: Date.now() }]);

  const reset = () => {
    setMessages([]);
    setDraft("");
    localStorage.removeItem(KEY);
  };

  const value = useMemo(() => ({ messages, draft, addMessage, setDraft, reset }), [messages, draft]);
  return <ChatCtx.Provider value={value}>{children}</ChatCtx.Provider>;
}

export const useChatState = () => {
  const ctx = useContext(ChatCtx);
  if (!ctx) throw new Error("useChatState must be used inside ChatStateProvider");
  return ctx;
};
