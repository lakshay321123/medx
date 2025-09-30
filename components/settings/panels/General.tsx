"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown, Play } from "lucide-react";
import { usePrefs } from "@/components/providers/PreferencesProvider";
import { useT } from "@/components/hooks/useI18n";
import { applyTheme } from "@/lib/theme";

const LANG_LABELS = {
  en: "English",
  hi: "Hindi",
  ar: "Arabic",
  it: "Italian",
  zh: "Chinese",
  es: "Spanish",
} as const;

const THEME_OPTIONS = {
  System: "system",
  Light: "light",
  Dark: "dark",
} as const;

const THEME_ITEMS = ["System", "Light", "Dark"] as const;

type MenuProps = {
  label: string;
  value: string;
  onPick: (value: string) => void;
  items: string[];
};

function Menu({ label, value, onPick, items }: MenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const handlePointer = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointer, { passive: true });
    document.addEventListener("keydown", handleKey, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text)] focus-visible:outline-none focus-visible:ring-2"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={label}
      >
        {value}
        <ChevronDown size={14} className="opacity-70" />
      </button>
      <div
        id={menuId}
        role="listbox"
        className={`absolute right-0 z-10 mt-2 w-44 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-md ${open ? "block" : "hidden"}`}
      >
        {items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              onPick(item);
              setOpen(false);
            }}
            className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)]"
            role="option"
            aria-selected={item === value}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function GeneralPanel() {
  const prefs = usePrefs();
  const t = useT();

  const Row = ({ title, sub, right }: { title: string; sub?: string; right: ReactNode }) => (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div>
        <div className="text-[13px] font-semibold">{title}</div>
        {sub && <div className="text-xs text-slate-500 dark:text-slate-400">{sub}</div>}
      </div>
      <div className="flex items-center gap-2">{right}</div>
    </div>
  );

  const themeLabel = prefs.theme === "system" ? "System" : prefs.theme === "light" ? "Light" : "Dark";
  const languages = Object.entries(LANG_LABELS) as [keyof typeof LANG_LABELS, string][];

  return (
    <>
      <div className="px-5 py-3 text-[13px] text-slate-500 dark:text-slate-400">
        {t("Adjust how MedX behaves and personalizes your care.")}
      </div>
      <Row
        title={t("Theme")}
        sub={t("Select how the interface adapts to your system.")}
        right={
          <Menu
            label={t("Theme")}
            value={themeLabel}
            onPick={(value) => {
              const theme = THEME_OPTIONS[value as keyof typeof THEME_OPTIONS];
              if (theme) {
                prefs.set("theme", theme);
                applyTheme(theme);
              }
            }}
            items={[...THEME_ITEMS]}
          />
        }
      />
      <Row
        title={t("Language")}
        sub={t("Choose your preferred conversational language.")}
        right={
          <select
            value={prefs.lang}
            onChange={(event) => {
              const next = event.target.value;
              const match = languages.find(([code]) => code === next);
              if (match) {
                prefs.setLang(match[0]);
              }
            }}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text)] focus-visible:outline-none focus-visible:ring-2"
            aria-label={t("Language")}
          >
            {languages.map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        }
      />
      <Row
        title={t("Voice")}
        sub={t("Preview and select the voice used for spoken responses.")}
        right={
          <>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text)] focus-visible:outline-none focus-visible:ring-2"
            >
              <Play size={14} /> Play
            </button>
            <Menu label={t("Voice")} value="Cove" onPick={() => {}} items={["Cove"]} />
          </>
        }
      />
    </>
  );
}
