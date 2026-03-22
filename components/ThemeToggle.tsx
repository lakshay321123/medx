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
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-so-border bg-so-card text-so-text shadow-sm transition hover:bg-white dark:border-so-border dark:bg-so-card dark:text-so-text dark:hover:bg-so-accent/10"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="sr-only">{t(theme === "dark" ? "Light" : "Dark")}</span>
    </button>
  );
}
