import { create } from "zustand";

export type TimelineCat = "ALL" | "LABS" | "VITALS" | "IMAGING" | "AI" | "NOTES";

const initialState = {
  cat: "ALL" as TimelineCat,
  focus: null as string | null,
  query: "",
  busy: false,
};

type TimelineFilterState = typeof initialState & {
  setCat: (cat: TimelineCat) => void;
  setFocus: (focus: string | null) => void;
  setQuery: (query: string) => void;
  start: () => void;
  finish: () => void;
  resetAll: () => void;
};

export const useTimelineFilterStore = create<TimelineFilterState>((set, get) => ({
  ...initialState,
  setCat: cat => set({ cat }),
  setFocus: focus =>
    set(state => ({
      focus,
      query:
        typeof focus === "string" && focus.length > 0
          ? focus
          : state.query,
    })),
  setQuery: query =>
    set(state => ({
      query,
      focus: state.focus ? null : state.focus,
    })),
  start: () => set({ busy: true }),
  finish: () => {
    if (!get().busy) return;
    set({ busy: false });
  },
  resetAll: () => set({ ...initialState }),
}));

export const resetTimelineFilters = () =>
  useTimelineFilterStore.getState().resetAll();

