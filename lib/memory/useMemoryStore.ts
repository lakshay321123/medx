import { create } from "zustand";

export type MemoryItem = {
  id?: string;
  key: string;
  value: any;
  scope: "global" | "thread";
  thread_id?: string;
};

type State = {
  enabled: boolean;
  rememberThisThread: boolean;
  suggestions: MemoryItem[];
  setEnabled: (v: boolean) => void;
  setRememberThisThread: (v: boolean) => void;
  pushSuggestion: (m: MemoryItem) => void;
  clearSuggestion: (key: string) => void;
};

export const useMemoryStore = create<State>((set) => ({
  enabled: true,
  rememberThisThread: false,
  suggestions: [],
  setEnabled: (v) => set({ enabled: v }),
  setRememberThisThread: (v) => set({ rememberThisThread: v }),
  pushSuggestion: (m) => set(s => ({ suggestions: [...s.suggestions, m] })),
  clearSuggestion: (key) => set(s => ({ suggestions: s.suggestions.filter(x => x.key !== key) })),
}));
