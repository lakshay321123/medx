"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type Plan = "free" | "pro";
type Tone = "plain" | "clinical" | "friendly";
type Lang = "en" | "hi" | "ar" | "it" | "zh" | "es";

type SettingsState = {
  // UI prefs
  theme: "system" | "light" | "dark";
  accent: "purple";
  tone: Tone;
  compact: boolean;
  quickActions: boolean;

  // i18n
  lang: Lang;
  dir: "ltr" | "rtl";

  // notifications
  medReminders: boolean;
  labUpdates: boolean;
  weeklyDigest: boolean;

  // security
  passcode: boolean;
  maskSensitive: boolean;
  sessionTimeout: "Never" | "5m" | "15m" | "1h";

  // account
  plan: Plan;
  promptsUsed: number;
  windowStart: number;

  setLang: (l: Lang) => void;
  set<K extends keyof SettingsState>(k: K, v: SettingsState[K]): void;
  incUsage: () => void;
  resetWindowIfNeeded: () => void;
  setPlan: (p: Plan) => void;
};

const WINDOW_DAYS = 30;
const ms = (d: number) => d * 24 * 60 * 60 * 1000;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: "system",
      accent: "purple",
      tone: "plain",
      compact: false,
      quickActions: true,
      lang: "en",
      dir: "ltr",
      medReminders: false,
      labUpdates: false,
      weeklyDigest: false,
      passcode: false,
      maskSensitive: false,
      sessionTimeout: "Never",
      plan: "free",
      promptsUsed: 0,
      windowStart: Date.now(),

      setLang: (l) => set({ lang: l, dir: l === "ar" ? "rtl" : "ltr" }),
      set: (k, v) => set({ [k]: v } as any),

      incUsage: () => {
        const s = get();
        set({ promptsUsed: s.promptsUsed + 1 });
      },
      resetWindowIfNeeded: () => {
        const s = get();
        if (Date.now() - s.windowStart > ms(WINDOW_DAYS)) {
          set({ windowStart: Date.now(), promptsUsed: 0 });
        }
      },
      setPlan: (p) => set({ plan: p }),
    }),
    { name: "medx-settings-v1" },
  ),
);
