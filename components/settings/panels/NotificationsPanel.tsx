"use client";

import { useState } from "react";

function Toggle({ label, description, initial = false }: { label: string; description?: string; initial?: boolean }) {
  const [enabled, setEnabled] = useState(initial);

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-white">{label}</p>
        {description ? <p className="text-xs text-neutral-400">{description}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => setEnabled((prev) => !prev)}
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

export default function NotificationsPanel() {
  return (
    <div className="flex flex-col divide-y divide-neutral-800/70">
      <Toggle label="Medication reminders" description="Receive nudges to stay on schedule." initial />
      <Toggle label="Lab report updates" description="Be alerted when new results are ready." initial />
      <Toggle label="Weekly health digest" description="Email summary with trends and highlights." />
    </div>
  );
}
