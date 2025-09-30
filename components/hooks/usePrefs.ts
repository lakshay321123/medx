"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { Prefs as ProviderPrefs } from "@/components/providers/PreferencesProvider";
import { usePrefs as useProviderPrefs } from "@/components/providers/PreferencesProvider";

export type LangMethod = "user" | "auto" | "fallback";

const LANG_METHOD_KEY = "medx-lang-method";
export const DEFAULT_LANG = "en";
const DEFAULT_LANG_METHOD: LangMethod = "user";

function readStoredLangMethod(): LangMethod {
  if (typeof window === "undefined") return DEFAULT_LANG_METHOD;
  try {
    const stored = window.localStorage.getItem(LANG_METHOD_KEY);
    if (stored === "auto" || stored === "fallback" || stored === "user") {
      return stored;
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_LANG_METHOD;
}

export type Prefs = Omit<ProviderPrefs, "lang" | "setLang"> & {
  lang: string;
  lang_method?: LangMethod;
  setLang: (lang: string, method?: LangMethod) => void;
};

export function usePrefs(): Prefs {
  const base = useProviderPrefs();
  const [langMethod, setLangMethod] = useState<LangMethod>(() => readStoredLangMethod());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handle = () => {
      setLangMethod(readStoredLangMethod());
    };
    window.addEventListener("storage", handle);
    return () => window.removeEventListener("storage", handle);
  }, []);

  useEffect(() => {
    setLangMethod(readStoredLangMethod());
  }, [base.lang]);

  const setLang = useCallback(
    (lang: string, method: LangMethod = DEFAULT_LANG_METHOD) => {
      base.setLang(lang as ProviderPrefs["lang"]);
      setLangMethod(method);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(LANG_METHOD_KEY, method);
        } catch {
          // ignore storage write errors
        }
      }
    },
    [base],
  );

  return useMemo(
    () => ({
      ...base,
      lang: base.lang ?? DEFAULT_LANG,
      lang_method: langMethod,
      setLang,
    }),
    [base, langMethod, setLang],
  );
}

export function usePreferredLang(): string {
  const prefs = useProviderPrefs();
  return prefs.lang ?? DEFAULT_LANG;
}
