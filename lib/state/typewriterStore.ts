import { create } from "zustand";

type State = {
  done: Record<string, true>;
  markDone: (k: string) => void;
  isDone: (k: string) => boolean;
};

export const useTypewriterStore = create<State>((set, get) => ({
  done: {},
  markDone: (k) => set((s) => ({ done: { ...s.done, [k]: true } })),
  isDone: (k) => !!get().done[k],
}));
