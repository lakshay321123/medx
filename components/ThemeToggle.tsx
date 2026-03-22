"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useT } from "@/components/hooks/useI18n";

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const t = useT();
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const next = resolvedTheme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      aria-label={t("Toggle theme")}
      title={t("Toggle theme")}
      onClick={() => setTheme(next)}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border transition"
      style={{ borderColor: "var(--so-border, #E5E5EA)", color: "var(--so-text, #000)" }}
    >
      {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="sr-only">{t(resolvedTheme === "dark" ? "Light" : "Dark")}</span>
    </button>
  );
}
