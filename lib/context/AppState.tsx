"use client";
import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";

type Role = "user" | "assistant" | "system";
export type Message = { id: string; role: Role; content: string; ts: number };
type Thread = { messages: Message[]; topic?: string; updatedAt?: number };

type State = {
  activeThreadId: string | null;
  threads: Record<string, Thread>;
  settings: { processHealthData: boolean };
};
type Action =
  | { type: "HYDRATE"; payload: Partial<State> }
  | { type: "SET_ACTIVE_THREAD"; id: string }
  | { type: "ADD_MESSAGE"; id: string; message: Message }
  | { type: "SET_TOPIC"; id: string; topic: string }
  | { type: "SET_PROCESS_HEALTH"; value: boolean };

const NS = "medx:v1";
const SNAP = `${NS}:snap`;
const TKEY = (id: string) => `${NS}:thread:${id}`;

const AppStateCtx = createContext<{ state: State; dispatch: React.Dispatch<Action> } | null>(null);

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "HYDRATE": {
      return { ...state, ...action.payload, threads: { ...state.threads, ...(action.payload.threads ?? {}) } };
    }
    case "SET_ACTIVE_THREAD": {
      const threads = { ...state.threads };
      if (!threads[action.id]) threads[action.id] = { messages: [], updatedAt: Date.now() };
      return { ...state, activeThreadId: action.id, threads };
    }
    case "ADD_MESSAGE": {
      const t = state.threads[action.id] ?? { messages: [], updatedAt: 0 };
      const nextT: Thread = { ...t, messages: [...t.messages, action.message], updatedAt: Date.now() };
      return { ...state, threads: { ...state.threads, [action.id]: nextT } };
    }
    case "SET_TOPIC": {
      const t = state.threads[action.id] ?? { messages: [], updatedAt: 0 };
      const nextT: Thread = { ...t, topic: action.topic, updatedAt: Date.now() };
      return { ...state, threads: { ...state.threads, [action.id]: nextT } };
    }
    case "SET_PROCESS_HEALTH": {
      return { ...state, settings: { ...state.settings, processHealthData: action.value } };
    }
    default:
      return state;
  }
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    activeThreadId: null,
    threads: {},
    settings: { processHealthData: false },
  });

  // HYDRATE once from localStorage
  useEffect(() => {
    try {
      const snap = JSON.parse(localStorage.getItem(SNAP) || "{}");
      const activeThreadId = snap.activeThreadId ?? "default";
      const tRaw = localStorage.getItem(TKEY(activeThreadId));
      const threads = tRaw ? { [activeThreadId]: JSON.parse(tRaw) as Thread } : {};
      dispatch({ type: "HYDRATE", payload: { activeThreadId, threads, settings: snap.settings } });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist snapshot (activeThreadId + settings)
  useEffect(() => {
    try {
      localStorage.setItem(
        SNAP,
        JSON.stringify({ activeThreadId: state.activeThreadId, settings: state.settings })
      );
    } catch {}
  }, [state.activeThreadId, state.settings]);

  // Persist each thread as it changes
  useEffect(() => {
    const id = state.activeThreadId;
    if (!id) return;
    try {
      const t = state.threads[id];
      if (t) localStorage.setItem(TKEY(id), JSON.stringify(t));
    } catch {}
  }, [state.activeThreadId, state.threads]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <AppStateCtx.Provider value={value}>{children}</AppStateCtx.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateCtx);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
