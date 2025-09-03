"use client";
import { createContext, useContext, useState } from "react";

export type Topic = { text: string; setBy: "user" | "doc"; at: number };

type Ctx = {
  topic: Topic | null;
  setTopic: (text: string, setBy?: "user" | "doc") => void;
  clearTopic: () => void;
};

const TopicCtx = createContext<Ctx | null>(null);

export function TopicProvider({ children }: { children: React.ReactNode }) {
  const [topic, set] = useState<Topic | null>(null);
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
