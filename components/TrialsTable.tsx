'use client';

import React, { useMemo, useState } from "react";
import Markdown from "@/components/Markdown";

export default function TrialsTable({ payload, markdownFallback }: { payload: any; markdownFallback?: string }) {
  const [sortKey, setSortKey] = useState<string>("phase");
  const [asc, setAsc] = useState<boolean>(false);

  const rows = useMemo(() => {
    const arr = [...(payload?.rows || [])];
    arr.sort((a,b) => {
      const av = String(a[sortKey] ?? "");
      const bv = String(b[sortKey] ?? "");
      return asc ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return arr;
  }, [payload, sortKey, asc]);

  if (!payload?.rows?.length) {
    // safety fallback if something is off
    return markdownFallback ? <Markdown text={markdownFallback} /> : null;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-separate border-spacing-y-1">
        <thead>
          <tr className="text-left">
            {payload.columns.map((c: any) => (
              <th
                key={c.key}
                className="px-3 py-2 cursor-pointer select-none"
                onClick={() => (setAsc(k => c.key === sortKey ? !k : false), setSortKey(c.key))}
                title="Sort"
              >
                {c.label}{sortKey === c.key ? (asc ? " ▲" : " ▼") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any, idx: number) => (
            <tr key={idx} className="bg-white/60 hover:bg-white/90 rounded-xl">
              <td className="px-3 py-2 font-medium">
                {r.title?.href ? <a className="underline" href={r.title.href} target="_blank" rel="noreferrer">{r.title.text}</a> : r.title?.text || "—"}
              </td>
              <td className="px-3 py-2">{r.phase}</td>
              <td className="px-3 py-2">{r.status}</td>
              <td className="px-3 py-2">{r.registry}</td>
              <td className="px-3 py-2">{r.country}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
