import { create } from "zustand";
import { persist } from "zustand/middleware";

type State = {
  done: Record<string, true>;
  markDone: (k: string) => void;
  isDone: (k: string) => boolean;
};

export const useTypewriterStore = create<State>()(
  persist(
    (set, get) => ({
      done: {},
      markDone: (k) => set((s) => ({ done: { ...s.done, [k]: true } })),
      isDone: (k) => !!get().done[k],
    }),
    { name: "typewriterDone" }
  )
);
