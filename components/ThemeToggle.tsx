"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useT } from "@/components/hooks/useI18n";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const t = useT();
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      aria-label={t("Toggle theme")}
      title={t("Toggle theme")}
      onClick={() => setTheme(next)}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white text-[#202123] shadow-sm transition hover:bg-slate-100 dark:border-white/10 dark:bg-[#1f1f1f] dark:text-[#ececf1] dark:hover:bg-[#2a2a2a]"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="sr-only">{t(theme === "dark" ? "Light" : "Dark")}</span>
    </button>
  );
}
