"use client";

import { useEffect, useState } from "react";

export default function PanelLoader({ label }: { label: string }) {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowHint(true), 3200);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex flex-col items-center gap-2" role="status" aria-live="polite">
        <span className="inline-flex h-12 w-12 items-center justify-center text-primary">
          <span className="h-12 w-12 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
        </span>
        <span className="text-sm font-medium text-[color:var(--medx-text)] dark:text-[color:var(--medx-text)]">
          {label}
        </span>
      </div>
      {showHint ? (
        <p className="max-w-[220px] text-xs text-slate-500 dark:text-slate-400">
          Fetching your data securely…
        </p>
      ) : null}
    </div>
  );
}
