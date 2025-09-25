"use client";

import React from "react";
import type { TrialRow } from "@/types/trials";
import { TrialsRow } from "./TrialsRow";

export default function TrialsTable({ rows }: { rows: TrialRow[] }) {
  if (!rows || rows.length === 0) return null;

  const sourceCounts =
    process.env.NODE_ENV !== "production"
      ? rows.reduce((m: Record<string, number>, r: any) => {
          const s = (r.source || "unknown").toUpperCase();
          m[s] = (m[s] || 0) + 1;
          return m;
        }, {})
      : null;

  const copyTrial = async (row: TrialRow) => {
    try {
      const summary = [row.title, row.url].filter(Boolean).join("\n");
      if (summary) await navigator.clipboard?.writeText(summary);
    } catch (err) {
      console.warn("Failed to copy trial", err);
    }
  };

  const countryList = (row: TrialRow) => {
    const fromLocations = Array.isArray(row.locations)
      ? row.locations
          .map(location => location?.country)
          .filter((country): country is string => Boolean(country))
      : [];
    const base = row.country ? [row.country] : [];
    const unique = Array.from(new Set([...fromLocations, ...base])).filter(Boolean);
    return unique.join(", ") || undefined;
  };

  const chipClass =
    "inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/15";

  const phaseLabelFor = (phase?: string | null) => {
    if (!phase) return undefined;
    const trimmed = phase.trim();
    if (!trimmed) return undefined;
    return /phase/i.test(trimmed) ? trimmed : `Phase ${trimmed}`;
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:hidden">
        {rows.map((row, index) => {
          const countries = countryList(row);
          const metaParts = [row.status, phaseLabelFor(row.phase), countries]
            .filter(Boolean)
            .join(" • ");
          const registryLabel = row.source ? row.source.toUpperCase() : undefined;
          return (
            <article
              key={`${row.source || "src"}:${row.id || row.url || index}`}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white shadow-sm backdrop-blur-sm"
            >
              <h3 className="text-sm font-semibold leading-5 break-words hyphens-auto">{row.title}</h3>
              {metaParts ? (
                <p className="mt-1 text-xs opacity-80">{metaParts}</p>
              ) : null}
              <p className="mt-1 text-[11px] opacity-70">
                {[row.id || row.url || "", registryLabel].filter(Boolean).join(" • ")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {row.status ? (
                  <span className={`${chipClass} cursor-default`}>Status: {row.status}</span>
                ) : null}
                <button
                  type="button"
                  className={chipClass}
                  onClick={() => copyTrial(row)}
                >
                  Copy
                </button>
                {row.url ? (
                  <a
                    href={row.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${chipClass} hover:bg-white/20`}
                  >
                    View details
                  </a>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      <div className="hidden md:block">
        {sourceCounts ? (
          <div className="mb-2 text-xs text-slate-500">
            Source counts: {JSON.stringify(sourceCounts)}
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1">Registry ID</th>
                <th className="border px-2 py-1">Title</th>
                <th className="border px-2 py-1">Phase</th>
                <th className="border px-2 py-1">Status</th>
                <th className="border px-2 py-1">Country</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const key = `${row.source || "src"}:${row.id || row.url || i}`;
                return (
                  <TrialsRow
                    key={key}
                    row={{
                      nctId: row.id || row.url || "",
                      title: row.title,
                      phase: row.phase,
                      status: row.status,
                      country: row.country,
                    }}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
