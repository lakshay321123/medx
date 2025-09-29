"use client";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";

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

  directoryShowOriginalName: boolean;

  passcode: boolean;
  maskSensitive: boolean;
  sessionTimeout: "Never" | "5m" | "15m" | "1h";

  plan: Plan;
  promptsUsed: number;
  windowEndsAt: number;

  // actions
  set<K extends keyof Prefs>(key: K, val: Prefs[K]): void;
  setLang(l: Lang): void;
  incUsage(): void;
  resetWindowIfNeeded(): boolean;
  setPlan(p: Plan): void;
  canSend(): boolean;
};

const KEY = "medx-prefs-v1";
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

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

  directoryShowOriginalName: true,

  passcode: false,
  maskSensitive: false,
  sessionTimeout: "Never",

  plan: "free",
  promptsUsed: 0,
  windowEndsAt: Date.now() + WINDOW_MS,

  set() {},
  setLang() {},
  incUsage() {},
  resetWindowIfNeeded() {
    return false;
  },
  setPlan() {},
  canSend() {
    return true;
  },
};

const Ctx = createContext<Prefs>(DEFAULT);

export default function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const mounted = useRef(false);
  const [state, setState] = useState<Prefs>(DEFAULT);

  const persist = useCallback((value: Prefs) => {
    if (typeof window === "undefined") return;
    const {
      set,
      setLang,
      incUsage,
      resetWindowIfNeeded,
      setPlan,
      canSend,
      ...rest
    } = value;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(rest));
    } catch {}
  }, []);

  // load after mount (no SSR localStorage)
  useEffect(() => {
    mounted.current = true;
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
    let parsed: unknown = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }

    if (parsed && typeof parsed === "object") {
      setState((s) => {
        const snapshot = parsed as Record<string, unknown>;
        const lang = typeof snapshot.lang === "string" ? (snapshot.lang as Lang) : s.lang;
        const windowEndsAt =
          typeof snapshot.windowEndsAt === "number"
            ? snapshot.windowEndsAt
            : typeof snapshot.windowStart === "number"
            ? snapshot.windowStart + WINDOW_MS
            : s.windowEndsAt;
        return {
          ...s,
          ...snapshot,
          lang,
          dir: lang === "ar" ? "rtl" : "ltr",
          windowEndsAt,
        } as Prefs;
      });
    } else if (raw) {
      window.localStorage.removeItem(KEY);
    }
  }, []);

  // persist after any change (client only)
  useEffect(() => {
    if (!mounted.current) return;
    persist(state);
  }, [persist, state]);

  const api = useMemo<Prefs>(() => {
    const setLang = (l: Lang) => {
      setState((s) => ({ ...s, lang: l, dir: l === "ar" ? "rtl" : "ltr" } as Prefs));
    };
    const set = <K extends keyof Prefs>(key: K, val: Prefs[K]) => {
      if (key === "lang") {
        setLang(val as Lang);
        return;
      }
      if (key === "dir") {
        return;
      }
      setState((s) => ({ ...s, [key]: val }));
    };
    const incUsage = () => setState((s) => ({ ...s, promptsUsed: s.promptsUsed + 1 }));
    const resetWindowIfNeeded = () => {
      let didReset = false;
      setState((s) => {
        const now = Date.now();
        const windowEndsAt = typeof s.windowEndsAt === "number" ? s.windowEndsAt : Date.now() + WINDOW_MS;
        const needReset = now >= windowEndsAt;
        if (!needReset) {
          return s;
        }
        didReset = true;
        const next: Prefs = {
          ...s,
          promptsUsed: 0,
          windowEndsAt: now + WINDOW_MS,
        };
        persist(next);
        return next;
      });
      return didReset;
    };
    const setPlan = (p: Plan) => setState((s) => ({ ...s, plan: p }));
    const canSend = () => {
      const reset = resetWindowIfNeeded();
      if (state.plan === "pro") return true;
      const used = reset ? 0 : state.promptsUsed;
      return used < 10;
    };

    return {
      ...state,
      set,
      setLang,
      incUsage,
      resetWindowIfNeeded,
      setPlan,
      canSend,
    };
  }, [persist, state]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function usePrefs() { return useContext(Ctx); }
