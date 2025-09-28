"use client";

import { useEffect, useState } from "react";
import { safeJson } from "@/lib/safeJson";
import { useMemoryStore } from "@/lib/memory/useMemoryStore";

interface PreferencesProps {
  className?: string;
}

function Switch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void | Promise<void>;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={`relative inline-flex h-6 w-11 cursor-pointer items-center ${
        disabled ? "cursor-not-allowed opacity-50" : ""
      }`}
    >
      <span className="sr-only">{label}</span>
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={(event) => {
          void onChange(event.target.checked);
        }}
        disabled={disabled}
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full bg-slate-300 transition peer-checked:bg-[var(--medx-accent)] dark:bg-neutral-700"
      />
      <span
        aria-hidden="true"
        className="relative ml-1 inline-block h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5 dark:bg-neutral-200"
      />
    </label>
  );
}

export default function Preferences({ className = "" }: PreferencesProps) {
  const [consent, setConsent] = useState(false);
  const { enabled, setEnabled, autoSave, setAutoSave } = useMemoryStore();

  useEffect(() => {
    safeJson(fetch("/api/auth/session"))
      .then((s) => setConsent(Boolean(s?.user?.consentFlags?.process)))
      .catch(() => setConsent(false));
  }, []);

  const updateConsent = async (next: boolean) => {
    setConsent(next);
    try {
      await fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consentFlags: { process: next } }),
      });
    } catch {}
  };

  return (
    <div
      className={`space-y-4 rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-900/80 ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Process my health data</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Allow MedX to analyze health information for smarter insights.
          </p>
        </div>
        <Switch checked={consent} onChange={updateConsent} label="Process my health data" />
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white/75 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Smart Memory</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Remember preferences and key facts with your consent. You can turn this off anytime.
            </p>
          </div>
          <Switch
            checked={enabled}
            onChange={setEnabled}
            label="Smart Memory"
          />
        </div>
        <div className="mt-3 flex items-start justify-between gap-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">Auto-save detected memories</p>
          <Switch
            checked={autoSave}
            onChange={setAutoSave}
            label="Auto-save detected memories"
            disabled={!enabled}
          />
        </div>
      </div>
    </div>
  );
}
