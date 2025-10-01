"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { usePrefs } from "@/components/providers/PreferencesProvider";
import { useMemoryStore } from "@/lib/memory/useMemoryStore";
import { applyTheme } from "@/lib/theme";

const LANG_METHOD_KEY = "medx-lang-method";

type Draft = ReturnType<typeof usePrefs>;

type DraftCtx = {
  draft: Partial<Draft>;
  set: (key: keyof Draft | string, val: unknown) => void;
  reset(): void;
  commit(): void;
  hasChanges: boolean;
};

const Ctx = createContext<DraftCtx | null>(null);

export function PrefsDraftProvider({ children }: { children: React.ReactNode }) {
  const prefs = usePrefs();
  const memoryEnabled = useMemoryStore((s) => s.enabled);
  const memoryRemember = useMemoryStore((s) => s.rememberThisThread);
  const memoryAutoSave = useMemoryStore((s) => s.autoSave);
  const setMemoryEnabled = useMemoryStore((s) => s.setEnabled);
  const setMemoryRemember = useMemoryStore((s) => s.setRememberThisThread);
  const setMemoryAutoSave = useMemoryStore((s) => s.setAutoSave);

  const [langMethod, setLangMethod] = useState<string | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    try {
      return window.localStorage.getItem(LANG_METHOD_KEY) ?? undefined;
    } catch {
      return undefined;
    }
  });

  const getSnapshot = useCallback(() => ({
    ...prefs,
    "mem.enabled": memoryEnabled,
    "mem.rememberThisThread": memoryRemember,
    "mem.autoSave": memoryAutoSave,
    "lang.method": langMethod,
  }), [prefs, memoryEnabled, memoryRemember, memoryAutoSave, langMethod]);

  const initialRef = useRef<Record<string, unknown>>(getSnapshot());
  const [overrides, setOverrides] = useState<Record<string, unknown>>({});

  useEffect(() => {
    initialRef.current = getSnapshot();
  }, [getSnapshot]);

  const api = useMemo<DraftCtx>(() => {
    const draft: Partial<Draft> = new Proxy(
      {},
      {
        get: (_target, prop) => {
          if (typeof prop === "string") {
            if (prop in overrides) return overrides[prop];
            return (initialRef.current as any)[prop];
          }
          return undefined;
        },
      },
    ) as Partial<Draft>;

    const set = (key: string, val: unknown) => {
      setOverrides((prev) => {
        const base = (initialRef.current as any)[key];
        if (Object.is(base, val)) {
          if (!(key in prev)) return prev;
          const { [key]: _omit, ...rest } = prev;
          return rest;
        }
        if (key in prev && Object.is(prev[key], val)) {
          return prev;
        }
        return { ...prev, [key]: val };
      });
    };

    const reset = () => setOverrides({});

    const commit = () => {
      const entries = Object.entries(overrides);
      if (!entries.length) return;

      const langMethodOverride = overrides["lang.method"] as string | undefined;

      for (const [key, value] of entries) {
        if (key === "lang.method") continue;
        if (key.startsWith("mem.")) {
          const boolVal = Boolean(value);
          if (key === "mem.enabled") setMemoryEnabled(boolVal);
          if (key === "mem.rememberThisThread") setMemoryRemember(boolVal);
          if (key === "mem.autoSave") setMemoryAutoSave(boolVal);
          continue;
        }
        if (key === "theme") {
          if (value === "light" || value === "dark" || value === "system") {
            applyTheme(value);
          }
        }
        if (key === "lang") {
          if (typeof prefs.setLang === "function") {
            prefs.setLang(value as Draft["lang"]);
          } else {
            prefs.set?.(key as any, value as any);
          }
          continue;
        }
        if (typeof (prefs as any)[key] === "function") continue;
        prefs.set?.(key as any, value as any);
      }

      if (langMethodOverride !== undefined) {
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(LANG_METHOD_KEY, langMethodOverride);
          } catch {
            // ignore storage failures
          }
        }
        setLangMethod(langMethodOverride);
      }

      reset();
    };

    const hasChanges = Object.keys(overrides).length > 0;

    return { draft, set: set as DraftCtx["set"], reset, commit, hasChanges };
  }, [overrides, prefs, setMemoryAutoSave, setMemoryEnabled, setMemoryRemember]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function usePrefsDraft() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePrefsDraft must be used within PrefsDraftProvider");
  return ctx;
}
