"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const next = resolvedTheme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(next)}
      className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[var(--so-text-secondary,#8E8E93)] transition hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[rgba(255,255,255,0.05)]"
    >
      {resolvedTheme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
    </button>
  );
}
