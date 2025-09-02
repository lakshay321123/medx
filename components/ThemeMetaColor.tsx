"use client";
import { useEffect } from "react";
import { useTheme } from "next-themes";

export function ThemeMetaColor() {
  const { theme } = useTheme();
  useEffect(() => {
    const meta = document.querySelector(
      'meta[name="theme-color"]'
    ) as HTMLMetaElement | null;
    if (!meta) return;
    meta.content = theme === "dark" ? "#0a0a0a" : "#ffffff";
  }, [theme]);
  return null;
}
