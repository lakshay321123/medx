import { create } from "zustand";

export type ChatMode = "patient" | "doctor";

export interface ModeState {
  mode: ChatMode;
  researchEnabled: boolean;
  setMode: (m: ChatMode) => void;
  setResearch: (on: boolean) => void;
}

export const useMode = create<ModeState>((set) => ({
  mode: "patient",
  researchEnabled: false,
  setMode: (mode) => set({ mode }),
  setResearch: (researchEnabled) => set({ researchEnabled }),
}));
