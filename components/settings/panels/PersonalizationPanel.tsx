"use client";

import { useState } from "react";

export default function PersonalizationPanel() {
  const [tone, setTone] = useState("Plain");
  const [compact, setCompact] = useState(false);
  const [quickActions, setQuickActions] = useState(true);

  const buttonClass = (value: string) =>
    `rounded-full border px-3 py-1.5 text-sm font-medium transition ${
      tone === value
        ? "shadow-sm"
        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-300 dark:hover:bg-neutral-800"
    }`;

  const renderToggle = (enabled: boolean, setEnabled: (value: boolean) => void) => (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => setEnabled(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
        enabled ? "bg-[var(--medx-accent)]" : "bg-slate-300 dark:bg-neutral-700"
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
    <div className="flex flex-col divide-y divide-slate-200 dark:divide-neutral-800">
      <div className="flex items-center justify-between gap-4 px-6 py-5">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Tone</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Shape how MedX responds to you.</p>
        </div>
        <div className="flex items-center gap-2">
          {(["Plain", "Clinical", "Friendly"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTone(option)}
              className={buttonClass(option)}
              style={
                tone === option
                  ? {
                      color: "var(--medx-accent)",
                      borderColor: "var(--medx-accent)",
                      backgroundColor: "color-mix(in srgb, var(--medx-accent) 16%, transparent)",
                    }
                  : undefined
              }
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 px-6 py-5">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Compact mode</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Tighten spacing for dense information displays.</p>
        </div>
        {renderToggle(compact, setCompact)}
      </div>

      <div className="flex items-center justify-between gap-4 px-6 py-5">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Show quick actions</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Surface shortcuts in chat threads.</p>
        </div>
        {renderToggle(quickActions, setQuickActions)}
      </div>
    </div>
  );
}
