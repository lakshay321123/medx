"use client";

import { useState } from "react";

export default function PersonalizationPanel() {
  const [tone, setTone] = useState("Plain");
  const [compact, setCompact] = useState(false);
  const [quickActions, setQuickActions] = useState(true);

  const buttonClass = (value: string) =>
    `rounded-full border px-3 py-1 text-sm transition ${
      tone === value
        ? "border-sky-500/80 bg-sky-500/20 text-white"
        : "border-neutral-700 bg-neutral-800/60 text-neutral-300 hover:border-neutral-500"
    }`;

  const renderToggle = (enabled: boolean, setEnabled: (value: boolean) => void) => (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => setEnabled(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
        enabled ? "bg-sky-500/90" : "bg-neutral-700"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          enabled ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );

  return (
    <div className="flex flex-col divide-y divide-neutral-800/70">
      <div className="flex items-center justify-between gap-4 px-4 py-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">Tone</p>
          <p className="text-xs text-neutral-400">Shape how MedX responds to you.</p>
        </div>
        <div className="flex items-center gap-2">
          {(["Plain", "Clinical", "Friendly"] as const).map((option) => (
            <button key={option} type="button" onClick={() => setTone(option)} className={buttonClass(option)}>
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 px-4 py-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">Compact mode</p>
          <p className="text-xs text-neutral-400">Tighten spacing for dense information displays.</p>
        </div>
        {renderToggle(compact, setCompact)}
      </div>

      <div className="flex items-center justify-between gap-4 px-4 py-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">Show quick actions</p>
          <p className="text-xs text-neutral-400">Surface shortcuts in chat threads.</p>
        </div>
        {renderToggle(quickActions, setQuickActions)}
      </div>
    </div>
  );
}
