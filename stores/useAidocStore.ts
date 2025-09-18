import { create } from "zustand";

export type AidocMsg = {
  id: string;
  role: "user" | "assistant" | string;
  content: string;
  pending?: boolean;
  error?: string;
};

type AidocState = {
  messages: AidocMsg[];
  hasAnimated: Record<string, true>;
  resetForThread: (id: string) => void;
  setMessages: (messages: AidocMsg[]) => void;
  appendMessage: (message: AidocMsg) => void;
  updateMessage: (id: string, patch: Partial<AidocMsg>) => void;
  removeMessage: (id: string) => void;
};

export const useAidocStore = create<AidocState>(set => ({
  messages: [],
  hasAnimated: {},
  resetForThread: () => set({ messages: [], hasAnimated: {} }),
  setMessages: messages => set({ messages }),
  appendMessage: message => set(state => ({ messages: [...state.messages, message] })),
  updateMessage: (id, patch) => set(state => ({
    messages: state.messages.map(m => (m.id === id ? { ...m, ...patch } : m)),
  })),
  removeMessage: id => set(state => ({ messages: state.messages.filter(m => m.id !== id) })),
}));
