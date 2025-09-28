"use client";

import { Play } from "lucide-react";
import { useMemo, useState } from "react";

const selectBase =
  "h-10 min-w-[160px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition focus:border-slate-300 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-100 dark:focus:border-neutral-500";

const pillBase =
  "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-100 dark:hover:bg-neutral-800";

export default function GeneralPanel() {
  const [theme, setTheme] = useState("system");
  const [language, setLanguage] = useState("Hindi");
  const [voice, setVoice] = useState("Cove");

  const accent = useMemo(() => ({ label: "Purple" }), []);

  return (
    <div className="flex flex-col divide-y divide-slate-200 dark:divide-neutral-800">
      <div className="flex items-center justify-between gap-4 px-6 py-5">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Theme</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Select how the interface adapts to your system.</p>
        </div>
        <select
          className={selectBase}
          value={theme}
          onChange={(event) => setTheme(event.target.value)}
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>

      <div className="flex items-center justify-between gap-4 px-6 py-5">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Accent color</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Update highlight elements across the app.</p>
        </div>
        <button type="button" className={pillBase}>
          <span
            aria-hidden="true"
            className="inline-flex h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: "var(--medx-purple)" }}
          />
          {accent.label}
        </button>
      </div>

      <div className="flex items-center justify-between gap-4 px-6 py-5">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Language</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Choose your preferred conversational language.</p>
        </div>
        <select
          className={selectBase}
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
        >
          <option value="Hindi">Hindi</option>
          <option value="Arabic">Arabic</option>
          <option value="Italian">Italian</option>
          <option value="Chinese-Simplified">Chinese (Simplified)</option>
          <option value="Spanish">Spanish</option>
        </select>
      </div>

      <div className="flex items-center justify-between gap-4 px-6 py-5">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Voice</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Preview and select the voice used for spoken responses.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-100 dark:hover:bg-neutral-800"
          >
            <Play size={14} /> Play
          </button>
          <select
            className={selectBase}
            value={voice}
            onChange={(event) => setVoice(event.target.value)}
          >
            <option value="Cove">Cove</option>
            <option value="Harbor">Harbor</option>
            <option value="Serene">Serene</option>
          </select>
        </div>
      </div>
    </div>
  );
}
