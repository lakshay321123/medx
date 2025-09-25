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
    <section className="md:hidden grid gap-3 px-3">
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
            className="space-y-2 rounded-2xl border border-white/10 bg-white/[.06] p-4 text-white"
          >
            {registryMeta ? (
              <p className="text-[11px] text-white/60">{registryMeta}</p>
            ) : null}

            <h3 className="text-sm font-semibold leading-5 text-white break-words hyphens-auto">
              {trial.title}
            </h3>

            {secondaryMeta ? (
              <p className="text-xs text-white/80">{secondaryMeta}</p>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg border border-white/15 bg-white/[.08] px-3 py-1 text-xs text-white"
              >
                Recruiting: {trial.recruitingCount ?? "—"}
              </button>

              <button
                type="button"
                className="rounded-lg border border-white/15 bg-white/[.08] px-3 py-1 text-xs text-white"
                onClick={() => copyTrialId(trial)}
                aria-label="Copy trial ID"
              >
                Copy
              </button>

              <button
                type="button"
                className="rounded-lg border border-white/15 bg-white/[.08] px-3 py-1 text-xs text-white"
                onClick={() => onSummarize(trial)}
              >
                View details
              </button>
            </div>

            {trial.registryUrl ? (
              <div className="pt-1">
                <a
                  href={trial.registryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-white underline"
                  aria-label="Open on registry website"
                >
                  Open on registry ↗
                </a>
              </div>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}
