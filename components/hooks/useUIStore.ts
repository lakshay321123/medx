"use client";

import { create } from "zustand";

export type PreferencesTab =
  | "General"
  | "Notifications"
  | "Personalization"
  | "Connectors"
  | "Schedules"
  | "Data controls"
  | "Security"
  | "Account";

type UIState = {
  prefsOpen: boolean;
  prefsTab: PreferencesTab;
  openPrefs: (tab?: PreferencesTab) => void;
  closePrefs: () => void;
  setPrefsTab: (tab: PreferencesTab) => void;
};

export const useUIStore = create<UIState>((set) => ({
  prefsOpen: false,
  prefsTab: "General",
  openPrefs: (tab) =>
    set((state) => ({
      prefsOpen: true,
      prefsTab: tab ?? state.prefsTab,
    })),
  closePrefs: () => set({ prefsOpen: false }),
  setPrefsTab: (tab) => set({ prefsTab: tab }),
}));
