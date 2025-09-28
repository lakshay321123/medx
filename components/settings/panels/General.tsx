"use client";
import type { ReactNode } from "react";
import { ChevronDown, Play } from "lucide-react";
import { usePrefs } from "@/components/providers/PreferencesProvider";

const langs = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "ar", label: "Arabic" },
  { code: "it", label: "Italian" },
  { code: "zh", label: "Chinese" },
  { code: "es", label: "Spanish" },
] as const;

export default function GeneralPanel() {
  const prefs = usePrefs();

  const Row = ({ title, sub, right }: { title: string; sub?: string; right: ReactNode }) => (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div>
        <div className="text-[13px] font-semibold">{title}</div>
        {sub && <div className="text-xs text-slate-500 dark:text-slate-400">{sub}</div>}
      </div>
      <div className="flex items-center gap-2">{right}</div>
    </div>
  );

  const LangSelect = (
    <div className="relative">
      <button className="inline-flex items-center justify-between gap-2 rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-slate-900/60">
        {langs.find((l) => l.code === prefs.lang)?.label ?? "English"}
        <ChevronDown size={14} className="opacity-70" />
      </button>
      <div className="absolute right-0 z-10 mt-2 w-44 overflow-hidden rounded-md border border-black/10 bg-white shadow-md dark:border-white/10 dark:bg-slate-900">
        {langs.map((l) => (
          <button key={l.code}
                  onClick={() => prefs.setLang(l.code)}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10">
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );

  const Pill = ({ dot = "#7C3AED", label = "Purple" }) => (
    <button className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-slate-900/60">
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: dot }} /> {label}
    </button>
  );

  return (
    <>
      <div className="px-5 py-3 text-[13px] text-slate-500 dark:text-slate-400">
        Adjust how MedX behaves and personalizes your care.
      </div>
      <Row title="Theme" sub="Select how the interface adapts to your system."
           right={<button className="inline-flex items-center justify-between gap-2 rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-slate-900/60">System <ChevronDown size={14} className="opacity-70" /></button>} />
      <Row title="Accent color" sub="Update highlight elements across the app." right={<Pill />} />
      <Row title="Language" sub="Choose your preferred conversational language." right={LangSelect} />
      <Row title="Voice" sub="Preview and select the voice used for spoken responses."
           right={<><button className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-slate-900/60"><Play size={14}/> Play</button><button className="inline-flex items-center justify-between gap-2 rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-slate-900/60">Cove <ChevronDown size={14} className="opacity-70"/></button></>} />
    </>
  );
}
