"use client";

import React from "react";
import type { TrialRow } from "@/types/trials";
import TrialsRow from "./TrialsRow";

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
            return <TrialsRow key={key} row={row} />;
          })}
        </tbody>
      </table>
    </div>
  );
}

