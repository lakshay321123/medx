"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Play } from "lucide-react";
import { useSettingsStore } from "@/lib/settings/store";
import { t } from "@/lib/i18n/dictionaries";

const Row = ({ title, sub, right }: { title: string; sub?: string; right: ReactNode }) => (
  <div className="flex items-center justify-between gap-4 px-5 py-4">
    <div>
      <div className="text-[13px] font-semibold">{title}</div>
      {sub ? <div className="text-xs text-slate-500 dark:text-slate-400">{sub}</div> : null}
    </div>
    <div className="flex items-center gap-2">{right}</div>
  </div>
);

const Select = ({ label }: { label: string }) => (
  <button className="inline-flex items-center justify-between gap-2 rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-slate-900/60">
    {label} <ChevronDown size={14} className="opacity-70" />
  </button>
);

const Pill = ({ dot = "#7C3AED", label = "Purple" }: { dot?: string; label?: string }) => (
  <button className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-slate-900/60">
    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: dot }} /> {label}
  </button>
);

const langs = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "ar", label: "Arabic" },
  { code: "it", label: "Italian" },
  { code: "zh", label: "Chinese" },
  { code: "es", label: "Spanish" },
] as const;

export default function GeneralPanel() {
  const lang = useSettingsStore((state) => state.lang);
  const setLang = useSettingsStore((state) => state.setLang);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const currentLangLabel = langs.find((item) => item.code === lang)?.label ?? "English";

  const LangSelect = (
    <div className="relative" ref={dropdownRef}>
      <button
        className="inline-flex items-center justify-between gap-2 rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-slate-900/60"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {currentLangLabel}
        <ChevronDown size={14} className="opacity-70" />
      </button>
      {open ? (
        <div className="absolute right-0 z-10 mt-2 w-40 rounded-md border border-black/10 bg-white shadow-md dark:border-white/10 dark:bg-slate-900">
          {langs.map((item) => (
            <button
              key={item.code}
              onClick={() => {
                setLang(item.code);
                setOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
              role="option"
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      <div className="px-5 py-3 text-[13px] text-slate-500 dark:text-slate-400">
        Adjust how MedX behaves and personalizes your care.
      </div>
      <Row title={t(lang, "Theme")} sub="Select how the interface adapts to your system." right={<Select label="System" />} />
      <Row title={t(lang, "Accent color")} sub="Update highlight elements across the app." right={<Pill />} />
      <Row title={t(lang, "Language")} sub="Choose your preferred conversational language." right={LangSelect} />
      <Row
        title={t(lang, "Voice")}
        sub="Preview and select the voice used for spoken responses."
        right={
          <>
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-slate-900/60">
              <Play size={14} /> Play
            </button>
            <Select label="Cove" />
          </>
        }
      />
    </>
  );
}
