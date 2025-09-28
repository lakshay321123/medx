"use client";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

type Plan = "free" | "pro";
type Lang = "en" | "hi" | "ar" | "it" | "zh" | "es";

export type Prefs = {
  theme: "system" | "light" | "dark";
  accent: "purple";
  tone: "plain" | "clinical" | "friendly";
  compact: boolean;
  quickActions: boolean;

  lang: Lang;
  dir: "ltr" | "rtl";

  memoryEnabled: boolean;
  memoryAutosave: boolean;

  medReminders: boolean;
  labUpdates: boolean;
  weeklyDigest: boolean;

  passcode: boolean;
  maskSensitive: boolean;
  sessionTimeout: "Never" | "5m" | "15m" | "1h";

  plan: Plan;
  promptsUsed: number;
  windowStart: number;

  // actions
  set<K extends keyof Prefs>(key: K, val: Prefs[K]): void;
  setLang(l: Lang): void;
  incUsage(): void;
  resetWindowIfNeeded(): void;
  setPlan(p: Plan): void;
};

const DEFAULT: Prefs = {
  theme: "system",
  accent: "purple",
  tone: "plain",
  compact: false,
  quickActions: true,

  lang: "en",
  dir: "ltr",

  memoryEnabled: true,
  memoryAutosave: true,

  medReminders: false,
  labUpdates: false,
  weeklyDigest: false,

  passcode: false,
  maskSensitive: false,
  sessionTimeout: "Never",

  plan: "free",
  promptsUsed: 0,
  windowStart: Date.now(),

  set() {},
  setLang() {},
  incUsage() {},
  resetWindowIfNeeded() {},
  setPlan() {},
};

const Ctx = createContext<Prefs>(DEFAULT);

const KEY = "medx-prefs-v1";
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export default function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const mounted = useRef(false);
  const [state, setState] = useState<Prefs>(DEFAULT);

  // load after mount (no SSR localStorage)
  useEffect(() => {
    mounted.current = true;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setState((s) => ({ ...s, ...parsed, dir: (parsed.lang === "ar" ? "rtl" : "ltr") as "ltr" | "rtl" }));
      }
    } catch {}
  }, []);

  // persist after any change (client only)
  useEffect(() => {
    if (!mounted.current) return;
    const { set, setLang, incUsage, resetWindowIfNeeded, setPlan, ...rest } = state;
    try { localStorage.setItem(KEY, JSON.stringify(rest)); } catch {}
  }, [state]);

  // apply lang/dir to <html> instantly
  useEffect(() => {
    if (!mounted.current) return;
    const html = document.documentElement;
    html.lang = state.lang;
    html.dir = state.dir;
  }, [state.lang, state.dir]);

  useEffect(() => {
    if (!mounted.current) return;
    const root = document.documentElement;
    if (state.theme === "system") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const sync = () => {
        root.classList.toggle("dark", media.matches);
      };
      sync();
      if (typeof media.addEventListener === "function") {
        media.addEventListener("change", sync);
        return () => media.removeEventListener("change", sync);
      }
      if (typeof media.addListener === "function") {
        media.addListener(sync);
        return () => media.removeListener(sync);
      }
      return;
    }
    root.classList.toggle("dark", state.theme === "dark");
  }, [state.theme]);

  const api = useMemo<Prefs>(() => ({
    ...state,
    set: (key, val) => setState((s) => ({ ...s, [key]: val })),
    setLang: (l) => setState((s) => ({ ...s, lang: l, dir: l === "ar" ? "rtl" : "ltr" })),
    incUsage: () => setState((s) => ({ ...s, promptsUsed: s.promptsUsed + 1 })),
    resetWindowIfNeeded: () => setState((s) => (Date.now() - s.windowStart > WINDOW_MS ? { ...s, windowStart: Date.now(), promptsUsed: 0 } : s)),
    setPlan: (p) => setState((s) => ({ ...s, plan: p })),
  }), [state]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function usePrefs() { return useContext(Ctx); }
