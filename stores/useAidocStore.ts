import { create } from 'zustand';

export type AidocMsg = { role: string; content: string };

export const useAidocStore = create<{
  messages: AidocMsg[];
  hasAnimated: Record<string, true>;
  resetForThread: (id: string) => void;
}>(set => ({
  messages: [],
  hasAnimated: {},
  resetForThread: () => set({ messages: [], hasAnimated: {} }),
}));
