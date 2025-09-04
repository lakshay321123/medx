"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export type Topic = { text: string; setBy: "user" | "doc"; at: number };

type Ctx = {
  topic: Topic | null;
  setTopic: (text: string, setBy?: "user" | "doc") => void;
  clearTopic: () => void;
};

const TopicCtx = createContext<Ctx | null>(null);

const key = (threadId: string) => `chat:${threadId}:topic`;

export function TopicProvider({ children }: { children: React.ReactNode }) {
  const params = useSearchParams();
  const threadId = params.get("threadId") || "default";
  const [topic, set] = useState<Topic | null>(null);

  // Load topic for current thread
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key(threadId));
      set(raw ? (JSON.parse(raw) as Topic) : null);
    } catch {
      set(null);
    }
  }, [threadId]);

  // Persist per-thread topic
  useEffect(() => {
    try {
      if (topic) localStorage.setItem(key(threadId), JSON.stringify(topic));
      else localStorage.removeItem(key(threadId));
    } catch {}
  }, [threadId, topic]);

  const setTopic: Ctx["setTopic"] = (text, setBy = "user") =>
    set({ text: normalizeTopic(text), setBy, at: Date.now() });
  const clearTopic = () => set(null);

  return (
    <TopicCtx.Provider value={{ topic, setTopic, clearTopic }}>
      {children}
    </TopicCtx.Provider>
  );
}

export function useTopic() {
  const ctx = useContext(TopicCtx);
  if (!ctx) throw new Error("useTopic must be used within TopicProvider");
  return ctx;
}

function normalizeTopic(s: string) {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}
