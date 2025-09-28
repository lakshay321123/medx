"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Play } from "lucide-react";
import { usePrefs } from "@/components/providers/PreferencesProvider";
import { useT } from "@/components/hooks/useI18n";

function Menu({
  value,
  onPick,
  items,
}: {
  value: string;
  onPick: (val: string) => void;
  items: string[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center justify-between gap-2 rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-slate-900/60"
      >
        {value} <ChevronDown size={14} className="opacity-70" />
      </button>
      <div
        className={`absolute right-0 z-10 mt-2 w-44 overflow-hidden rounded-md border border-black/10 bg-white shadow-md dark:border-white/10 dark:bg-slate-900 ${open ? "block" : "hidden"}`}
      >
        {items.map((item) => (
          <button
            key={item}
            type="button"
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

  const Row = ({ title, sub, right }: { title: string; sub?: string; right: ReactNode }) => (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div>
        <div className="text-[13px] font-semibold">{title}</div>
        {sub && <div className="text-xs text-slate-500 dark:text-slate-400">{sub}</div>}
      </div>
      <div className="flex items-center gap-2">{right}</div>
    </div>
  );

  const themeOptions = {
    System: "system",
    Light: "light",
    Dark: "dark",
  } as const;
  const themeLabel = prefs.theme === "system" ? "System" : prefs.theme === "light" ? "Light" : "Dark";
  const langMap = {
    en: "English",
    hi: "Hindi",
    ar: "Arabic",
    it: "Italian",
    zh: "Chinese",
    es: "Spanish",
  } as const;
  const languages = Object.entries(langMap) as Array<[keyof typeof langMap, string]>;

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
              const next = themeOptions[value as keyof typeof themeOptions];
              if (next) {
                prefs.set("theme", next);
              }
            }}
            items={Object.keys(themeOptions)}
          />
        }
      />
      <Row
        title={t("Language")}
        sub={t("Choose your preferred conversational language.")}
        right={
          <Menu
            value={langMap[prefs.lang as keyof typeof langMap]}
            onPick={(value) => {
              const found = languages.find(([, label]) => label === value);
              if (found) {
                prefs.setLang(found[0] as Parameters<typeof prefs.setLang>[0]);
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
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-slate-900/60"
            >
              <Play size={14} /> Play
            </button>
            <Menu value="Cove" onPick={() => {}} items={["Cove"]} />
          </>
        }
      />
    </>
  );
}
