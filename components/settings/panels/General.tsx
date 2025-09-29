"use client";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown, Play } from "lucide-react";
import { usePrefs } from "@/components/providers/PreferencesProvider";
import { useT } from "@/components/hooks/useI18n";

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
  value: string;
  onPick: (value: string) => void;
  items: string[];
};

function Menu({ value, onPick, items }: MenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center justify-between gap-2 rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-slate-900/60"
      >
        {value}
        <ChevronDown size={14} className="opacity-70" />
      </button>
      <div
        className={`absolute right-0 z-10 mt-2 w-44 overflow-hidden rounded-md border border-black/10 bg-white shadow-md dark:border-white/10 dark:bg-slate-900 ${open ? "block" : "hidden"}`}
      >
        {items.map((item) => (
          <button
            key={item}
            onClick={() => {
              onPick(item);
              setOpen(false);
            }}
            className="block w-full px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
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
  const showOriginal = prefs.directoryShowOriginalName !== false;

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
            value={themeLabel}
            onPick={(value) => {
              const theme = THEME_OPTIONS[value as keyof typeof THEME_OPTIONS];
              if (theme) {
                prefs.set("theme", theme);
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
          <Menu
            value={LANG_LABELS[prefs.lang]}
            onPick={(value) => {
              const match = languages.find(([, label]) => label === value);
              if (match) {
                prefs.setLang(match[0]);
              }
            }}
            items={languages.map(([, label]) => label)}
          />
        }
      />
      <Row
        title={t("Voice")}
        sub={t("Preview and select the voice used for spoken responses.")}
        right={
          <>
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-slate-900/60">
              <Play size={14} /> Play
            </button>
            <Menu value="Cove" onPick={() => {}} items={["Cove"]} />
          </>
        }
      />
      <div className="px-5 pt-6 text-[13px] text-slate-500 dark:text-slate-400">{t("Directory")}</div>
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div>
          <div className="text-[13px] font-semibold">
            {t("Show original name alongside translation")}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {t("Display localized provider names with originals in parentheses.")}
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={showOriginal}
          onClick={() => prefs.set("directoryShowOriginalName", !showOriginal)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 dark:focus-visible:ring-blue-500/50 ${
            showOriginal ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-700"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
              showOriginal ? "translate-x-5" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </>
  );
}
