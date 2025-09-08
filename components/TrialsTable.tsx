"use client";

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
            <th className="border px-2 py-1">City</th>
            <th className="border px-2 py-1">Country</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={`${t.source || "src"}:${t.id || t.url}`}>
              <td className="border px-2 py-1 whitespace-nowrap text-xs text-slate-700 dark:text-slate-200">
                {t.id ? (
                  <span className="font-mono px-1.5 py-0.5 rounded bg-white/40 dark:bg-white/5 border border-slate-200 dark:border-gray-800">
                    {t.id}
                  </span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
                <span className="ml-2 text-[10px] text-slate-500">{registryIdLabel(t.source)}</span>
              </td>
              <td className="border px-2 py-1 min-w-[24rem]">
                <a
                  href={t.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  {t.title}
                </a>
                {t.source && (
                  <span className="ml-2 inline-flex items-center rounded-full border border-slate-200 dark:border-gray-700 px-2 py-0.5 text-[10px] leading-4 text-slate-600 dark:text-slate-300">
                    {t.source}
                  </span>
                )}
              </td>
              <td className="border px-2 py-1">{t.phase}</td>
              <td className="border px-2 py-1">{t.status}</td>
              <td className="border px-2 py-1">{t.city}</td>
              <td className="border px-2 py-1">{t.country}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

