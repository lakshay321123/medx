"use client";

import Preferences from "../Preferences";

export default function DataControlsPanel() {
  return (
    <div className="flex flex-col divide-y divide-neutral-800/70">
      <div className="px-4 py-4">
        <Preferences />
      </div>

      <div className="flex items-center justify-between gap-4 px-4 py-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">Export my data</p>
          <p className="text-xs text-neutral-400">Download a secure archive of your conversations.</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-neutral-700 bg-neutral-800/60 px-4 py-2 text-sm font-medium text-neutral-100 transition hover:border-neutral-500 hover:bg-neutral-800"
        >
          Export
        </button>
      </div>

      <div className="flex items-center justify-between gap-4 px-4 py-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">Clear local memories</p>
          <p className="text-xs text-neutral-400">Remove on-device learning for a fresh start.</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-red-700/70 bg-red-900/10 px-4 py-2 text-sm font-semibold text-red-300 transition hover:border-red-500 hover:bg-red-900/20"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
