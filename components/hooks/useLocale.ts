"use client";

import { useMemo } from "react";

import { usePrefs } from "@/components/hooks/usePrefs";

export type LocaleDescriptor = {
  lang: string;
  locale: string;
  language: string;
  region: string;
  label: string;
  dir: "ltr" | "rtl";
};

const LOCALE_METADATA: Record<string, { language: string; region: string; locale: string; dir: "ltr" | "rtl" }> = {
  en: { language: "English", region: "United States", locale: "en-US", dir: "ltr" },
  hi: { language: "हिन्दी", region: "भारत", locale: "hi-IN", dir: "ltr" },
  ar: { language: "العربية", region: "مصر", locale: "ar-EG", dir: "rtl" },
  it: { language: "Italiano", region: "Italia", locale: "it-IT", dir: "ltr" },
  zh: { language: "中文", region: "中国", locale: "zh-CN", dir: "ltr" },
  es: { language: "Español", region: "México", locale: "es-MX", dir: "ltr" },
};

const FALLBACK_LOCALE = LOCALE_METADATA.en;

export function useLocale(): LocaleDescriptor {
  const prefs = usePrefs();
  return useMemo(() => {
    const info = LOCALE_METADATA[prefs.lang] ?? FALLBACK_LOCALE;
    const label = info.language;

    return {
      lang: prefs.lang,
      locale: info.locale,
      language: info.language,
      region: info.region,
      label,
      dir: info.dir,
    };
  }, [prefs.lang]);
}
