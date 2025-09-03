"use client";
import { createContext, useContext, useRef, useState } from "react";

export type ActiveContext = {
  id: string;
  kind: "analysis" | "chat";
  title: string;
  summary: string;
  entities?: string[];
  createdAt: number;
};

export type AnalysisCategory =
  | "xray"
  | "lab_report"
  | "prescription"
  | "discharge_summary"
  | "other_medical_doc";

export type ChatMessage =
  | { id: string; role: "user"; kind: "chat"; content: string }
  | { id: string; role: "assistant"; kind: "chat"; content: string }
  | {
      id: string;
      role: "assistant";
      kind: "analysis";
      category?: AnalysisCategory;
      content: string;
    };

type Ctx = {
  active: ActiveContext | null;
  setFromAnalysis: (msg: { id: string; category?: string; content: string }) => void;
  setFromChat: (msg: { id: string; content: string }) => void;
  clear: () => void;
};

const Context = createContext<Ctx | null>(null);

function trimToChars(s: string, max = 6400) {
  return s.length > max ? s.slice(0, max) + "…" : s;
}
function extractEntitiesHeuristic(text: string): string[] {
  const caps = text.match(/\b([A-Z][a-z0-9\-]+(?:\s+[A-Z][a-z0-9\-]+){0,2})\b/g) || [];
  const uniq = Array.from(new Set(caps));
  return uniq
    .filter(w =>
      /\b(cancer|tumou?r|fracture|metacarpal|pneumonia|diabetes|hypertension|x[- ]?ray|ct|mri|trial|dose|mg|mm)\b/i.test(
        text + " " + w
      )
    )
    .slice(0, 10);
}

export function ContextProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<ActiveContext | null>(null);
  const lastSet = useRef<number>(0);

  const setFromAnalysis: Ctx["setFromAnalysis"] = msg => {
    const title =
      msg.category === "lab_report"
        ? "Lab Report Summary"
        : msg.category === "xray"
        ? "Imaging Report"
        : msg.category === "prescription"
        ? "Prescription Summary"
        : "Medical Document Summary";
    setActive({
      id: msg.id,
      kind: "analysis",
      title,
      summary: trimToChars(msg.content, 2800),
      entities: extractEntitiesHeuristic(msg.content),
      createdAt: Date.now(),
    });
    lastSet.current = Date.now();
  };

  const setFromChat: Ctx["setFromChat"] = msg => {
    if ((msg.content || "").length < 400) return;
    setActive({
      id: msg.id,
      kind: "chat",
      title: "Conversation summary",
      summary: trimToChars(msg.content, 2400),
      entities: extractEntitiesHeuristic(msg.content),
      createdAt: Date.now(),
    });
    lastSet.current = Date.now();
  };

  const clear = () => setActive(null);

  return (
    <Context.Provider value={{ active, setFromAnalysis, setFromChat, clear }}>
      {children}
    </Context.Provider>
  );
}

export function useActiveContext() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useActiveContext must be used within ContextProvider");
  return ctx;
}

