"use client";

import { useCallback } from "react";

export type Trial = {
  id: string;
  title: string;
  status: string;
  phase?: string | number;
  countries?: string[];
  nctId?: string;
  registry?: string;
  registryUrl?: string;
  recruitingCount?: number;
};

export function TrialsMobileCards({
  trials,
  onSummarize,
}: {
  trials: Trial[];
  onSummarize: (trial: Trial) => void;
}) {
  const copyTrialId = useCallback(async (trial: Trial) => {
    const id = trial.nctId || trial.id || "";
    if (!id) return;
    try {
      await navigator.clipboard?.writeText(id);
    } catch (err) {
      console.warn("Failed to copy trial id", err);
    }
  }, []);

  if (!trials.length) {
    return null;
  }

  return (
    <div className="grid gap-3 md:hidden">
      {trials.map((trial) => {
        const registryMeta = [trial.nctId, trial.registry].filter(Boolean).join(" • ");
        const secondaryMeta = [
          trial.status,
          trial.phase ? `Phase ${trial.phase}` : null,
          trial.countries?.length ? trial.countries.join(", ") : null,
        ]
          .filter(Boolean)
          .join(" • ");

        return (
          <article
            key={trial.id}
            className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            {registryMeta ? (
              <div className="text-[11px] opacity-70">{registryMeta}</div>
            ) : null}

            <h3 className="text-sm font-semibold leading-5 wrap-anywhere">{trial.title}</h3>

            {secondaryMeta ? (
              <p className="text-xs opacity-80">{secondaryMeta}</p>
            ) : null}

            <div className="mt-1 flex flex-wrap gap-8">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs"
                >
                  Status: {trial.status || "—"}
                </button>
                <button
                  type="button"
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs"
                  onClick={() => copyTrialId(trial)}
                  aria-label="Copy trial ID"
                >
                  Copy
                </button>
                <button
                  type="button"
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs"
                  onClick={() => onSummarize(trial)}
                >
                  View details
                </button>
              </div>

              {trial.registryUrl ? (
                <a
                  href={trial.registryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs underline opacity-90"
                  aria-label="Open on registry website"
                >
                  Open on registry ↗
                </a>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
