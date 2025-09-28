"use client";
import { ChevronDown, Play } from "lucide-react";

export default function GeneralPanel() {
  const Row = ({ title, sub, right }: any) => (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div>
        <div className="text-[13px] font-semibold">{title}</div>
        {sub && <div className="text-xs text-slate-500 dark:text-slate-400">{sub}</div>}
      </div>
      <div className="flex items-center gap-2">{right}</div>
    </div>
  );
  const Select = ({ label = "System" }) => (
    <button className="inline-flex items-center justify-between gap-2 rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-slate-900/60">
      {label} <ChevronDown size={14} className="opacity-70" />
    </button>
  );
  const Pill = ({ dot = "#7C3AED", label = "Purple" }) => (
    <button className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-slate-900/60">
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: dot }} /> {label}
    </button>
  );

  return (
    <>
      <div className="px-5 py-3 text-[13px] text-slate-500 dark:text-slate-400">Adjust how MedX behaves and personalizes your care.</div>
      <Row title="Theme" sub="Select how the interface adapts to your system." right={<Select label="System" />} />
      <Row title="Accent color" sub="Update highlight elements across the app." right={<Pill />} />
      <Row title="Language" sub="Choose your preferred conversational language." right={<Select label="Hindi" />} />
      <Row
        title="Voice"
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
