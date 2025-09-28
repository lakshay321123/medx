"use client";

import { useEffect } from "react";
import { usePrefs } from "@/components/providers/PreferencesProvider";

export default function LangDirEffect() {
  const { lang } = usePrefs();

  useEffect(() => {
    const html = document.documentElement;
    html.lang = lang;
    html.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  return null;
}
