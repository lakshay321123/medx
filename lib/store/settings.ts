"use client";
import { create } from "zustand";

type SettingsState = {
  processHealthData: boolean;
  setProcessHealthData: (v: boolean) => void;
  hydrate: () => void;
};

const KEY = "medx:v1:settings";

export const useSettings = create<SettingsState>((set, get) => ({
  processHealthData: false,
  setProcessHealthData: (v) => {
    set({ processHealthData: v });
    try { localStorage.setItem(KEY, JSON.stringify({ processHealthData: v })); } catch {}
  },
  hydrate: () => {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || "{}");
      if (typeof data.processHealthData === "boolean") set({ processHealthData: data.processHealthData });
    } catch {}
  }
}));
