import { create } from "zustand";

export type MemoryItem = {
  id?: string;
  key: string;
  value: any;
  scope: "global" | "thread";
  thread_id?: string;
  confidence?: number;
  source?: string;
};

type State = {
  enabled: boolean;
  rememberThisThread: boolean;
  autoSave: boolean;
  suggestions: MemoryItem[];
  lastSaved?: { id: string; label: string } | null;
  setEnabled: (v: boolean) => void;
  setRememberThisThread: (v: boolean) => void;
  setAutoSave: (v: boolean) => void;
  pushSuggestion: (m: MemoryItem) => void;
  clearSuggestion: (key: string) => void;
  setLastSaved: (p: { id: string; label: string } | null) => void;
};

export const useMemoryStore = create<State>((set) => ({
  enabled: true,
  rememberThisThread: false,
  autoSave: true,
  suggestions: [],
  lastSaved: null,
  setEnabled: (v) => set({ enabled: v }),
  setRememberThisThread: (v) => set({ rememberThisThread: v }),
  setAutoSave: (v) => set({ autoSave: v }),
  pushSuggestion: (m) => set(s => ({ suggestions: [...s.suggestions, m] })),
  clearSuggestion: (key) => set(s => ({ suggestions: s.suggestions.filter(x => x.key !== key) })),
  setLastSaved: (p) => set({ lastSaved: p }),
}));
