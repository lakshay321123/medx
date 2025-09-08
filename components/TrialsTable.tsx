"use client";

import type { TrialRow } from "@/types/trials";

export default function TrialsTable({ rows }: { rows: TrialRow[] }) {
  if (!rows || rows.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-gray-300 text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1">NCT ID</th>
            <th className="border px-2 py-1">Title</th>
            <th className="border px-2 py-1">Phase</th>
            <th className="border px-2 py-1">Status</th>
            <th className="border px-2 py-1">City</th>
            <th className="border px-2 py-1">Country</th>
            <th className="border px-2 py-1">Source</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id}>
              <td className="border px-2 py-1">{t.id}</td>
              <td className="border px-2 py-1">
                <a
                  href={t.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  {t.title}
                </a>
              </td>
              <td className="border px-2 py-1">{t.phase}</td>
              <td className="border px-2 py-1">{t.status}</td>
              <td className="border px-2 py-1">{t.city}</td>
              <td className="border px-2 py-1">{t.country}</td>
              <td className="border px-2 py-1">
                <span className="inline-flex items-center rounded-full border border-slate-200 dark:border-gray-700 px-2 py-0.5 text-[10px] leading-4 text-slate-600 dark:text-slate-300">
                  {t.source || "Source"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

