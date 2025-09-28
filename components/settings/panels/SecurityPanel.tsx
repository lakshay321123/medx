"use client";

import { useState } from "react";

const selectBase =
  "h-10 min-w-[140px] rounded-lg border border-neutral-700 bg-neutral-900/80 px-3 text-sm text-neutral-100 shadow-sm transition hover:border-neutral-500 focus:border-neutral-400 focus:outline-none";

function ToggleRow({
  label,
  description,
  initial = false,
}: {
  label: string;
  description: string;
  initial?: boolean;
}) {
  const [enabled, setEnabled] = useState(initial);
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-xs text-neutral-400">{description}</p>
      </div>
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
    </div>
  );
}

export default function SecurityPanel() {
  const [timeout, setTimeoutValue] = useState("15");

  return (
    <div className="flex flex-col divide-y divide-neutral-800/70">
      <ToggleRow label="Require passcode on open" description="Prompt for a passcode whenever MedX launches." initial />
      <ToggleRow label="Mask sensitive data" description="Blur personal details until hovered." />

      <div className="flex items-center justify-between gap-4 px-4 py-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">Session timeout</p>
          <p className="text-xs text-neutral-400">Automatically lock after inactivity.</p>
        </div>
        <select
          className={selectBase}
          value={timeout}
          onChange={(event) => setTimeoutValue(event.target.value)}
        >
          <option value="5">5 minutes</option>
          <option value="15">15 minutes</option>
          <option value="30">30 minutes</option>
          <option value="60">60 minutes</option>
        </select>
      </div>
    </div>
  );
}
