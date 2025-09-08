"use client";

import React from "react";
import type { TrialRow } from "@/types/trials";
import { registryIdLabel } from "@/lib/registry";

export default function TrialsTable({ rows }: { rows: TrialRow[] }) {
  if (!rows || rows.length === 0) return null;

  return (
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

        {/* debug: counts per source */}
        {process.env.NODE_ENV !== "production" && (
          <div className="mb-2 text-xs text-slate-500">
            Source counts: {JSON.stringify(
              rows.reduce((m: Record<string, number>, r: any) => {
                const s = (r.source || "unknown").toUpperCase();
                m[s] = (m[s] || 0) + 1;
                return m;
              }, {})
            )}
          </div>
        )}

        <tbody>
          {rows.map((row, i) => {
            const key = `${row.source || "src"}:${row.id || row.url || i}`;
            return (
              <tr key={key}>
                {/* Registry ID */}
                <td className="border px-2 py-1 whitespace-nowrap align-top">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">
                      {registryIdLabel(row.source)}
                    </span>
                    {row.id ? (
                      <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-white/40 dark:bg-white/5 border border-slate-200 dark:border-gray-800">
                        {row.id}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </div>
                </td>

                {/* Title + Source chip (always clickable if url present) */}
                <td className="border px-2 py-1 align-top min-w-[24rem]">
                  {row.url ? (
                    <a
                      href={row.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2"
                    >
                      {row.title}
                    </a>
                  ) : (
                    <span>{row.title}</span>
                  )}
                  {row.source && (
                    <span className="ml-2 inline-flex items-center rounded-full border border-slate-200 dark:border-gray-700 px-2 py-0.5 text-[10px] leading-4 text-slate-600 dark:text-slate-300">
                      {row.source}
                    </span>
                  )}
                </td>

                <td className="border px-2 py-1 whitespace-nowrap align-top">
                  {row.phase || "—"}
                </td>
                <td className="border px-2 py-1 whitespace-nowrap align-top">
                  {row.status || "—"}
                </td>
                <td className="border px-2 py-1 whitespace-nowrap align-top">
                  {row.country || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

