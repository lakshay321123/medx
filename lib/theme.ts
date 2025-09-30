export type ThemeMode = "light" | "dark" | "system";

export function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  const sysDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const next = mode === "system" ? (sysDark ? "dark" : "light") : mode;
  root.classList.toggle("dark", next === "dark");
  localStorage.setItem("theme", mode);
}

export function initTheme() {
  let saved = localStorage.getItem("theme") as ThemeMode | null;
  if (!saved) {
    try {
      const stored = localStorage.getItem("medx-prefs-v1");
      if (stored) {
        const parsed = JSON.parse(stored) as { theme?: ThemeMode } | null;
        if (parsed && parsed.theme) {
          saved = parsed.theme;
        }
      }
    } catch {
      saved = null;
    }
  }
  const mode = saved ?? "system";
  applyTheme(mode);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    if ((localStorage.getItem("theme") || "system") === "system") {
      applyTheme("system");
    }
  };
  mq.addEventListener?.("change", onChange);
  return () => {
    mq.removeEventListener?.("change", onChange);
  };
}
