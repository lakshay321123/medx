"use client";

import Preferences from "../Preferences";

export default function DataControlsPanel() {
  return (
    <div className="flex flex-col divide-y divide-slate-200 dark:divide-neutral-800">
      <div className="px-6 py-5">
        <Preferences />
      </div>

      <div className="flex items-center justify-between gap-4 px-6 py-5">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Export my data</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Download a secure archive of your conversations.</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-200 dark:hover:bg-neutral-800"
        >
          Export
        </button>
      </div>

      <div className="flex items-center justify-between gap-4 px-6 py-5">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Clear local memories</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Remove on-device learning for a fresh start.</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
