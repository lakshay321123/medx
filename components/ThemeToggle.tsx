"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      aria-label="Toggle theme"
      onClick={() => setTheme(next)}
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm
                 bg-slate-100 text-slate-800 border-slate-200
                 hover:bg-slate-200
                 dark:bg-[var(--medx-panel)] dark:text-gray-100 dark:border-[color:var(--medx-outline)] dark:hover:bg-[var(--medx-surface)]"
    >
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
