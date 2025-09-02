"use client";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

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
      className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5
                 bg-gray-100 text-gray-900 hover:bg-gray-200
                 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700
                 transition-colors"
    >
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
