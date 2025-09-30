"use client";

import { useEffect } from "react";
import { usePrefs } from "@/components/providers/PreferencesProvider";
import { normalizeLanguageTag } from "@/lib/i18n/lang";

export default function LangDirEffect() {
  const { lang } = usePrefs();
  const normalized = normalizeLanguageTag(lang);

  useEffect(() => {
    const html = document.documentElement;
    html.lang = normalized;
    html.dir = normalized === "ar" ? "rtl" : "ltr";
  }, [normalized]);

  return null;
}
