"use client";
import Preferences from "../Preferences";

export default function DataControlsPanel() {
  return (
    <>
      <div className="px-5 py-3 text-[13px] text-slate-500 dark:text-slate-400">Adjust how MedX behaves and personalizes your care.</div>
      <div className="px-5 py-4">
        <Preferences />
      </div>

      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div>
          <div className="text-[13px] font-semibold">Export my data</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Download a secure archive of your conversations.</div>
        </div>
        <button className="rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-slate-900/60" disabled>
          Export
        </button>
      </div>

      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div>
          <div className="text-[13px] font-semibold">Clear local memories</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Remove on-device learning for a fresh start.</div>
        </div>
        <button className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300">
          Clear
        </button>
      </div>
    </>
  );
}
