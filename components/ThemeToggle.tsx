"use client";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";

type ThemeToggleProps = {
  className?: string;
};

export default function ThemeToggle({ className }: ThemeToggleProps = {}) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const baseClass = useMemo(
    () =>
      [
        "inline-flex h-9 items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-4 text-sm font-medium text-[#0F172A] shadow-sm transition",
        "hover:border-[#2563EB] hover:text-[#2563EB]",
        "dark:border-[#1E3A5F] dark:bg-[#13233D] dark:text-[#E6EDF7] dark:hover:border-[#3B82F6] dark:hover:text-[#3B82F6]",
        className,
      ]
        .filter(Boolean)
        .join(" "),
    [className],
  );
  if (!mounted) return null;

  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      aria-label="Toggle theme"
      onClick={() => setTheme(next)}
      className={baseClass}
    >
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
