"use client";
import { useEffect } from "react";
import { useSettingsStore } from "@/lib/settings/store";

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  const { lang, dir } = useSettingsStore((state) => ({ lang: state.lang, dir: state.dir }));

  useEffect(() => {
    const html = document.documentElement;
    html.lang = lang;
    html.dir = dir;
  }, [lang, dir]);

  return <>{children}</>;
}
