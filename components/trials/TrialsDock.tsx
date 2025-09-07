"use client";

import { useState } from "react";

type TrialFilters = {
  condition: string;
  phase: "Any" | "1" | "2" | "3" | "4";
  status: "Any" | "Recruiting" | "Completed" | "Active, not recruiting";
  country: "United States" | "India" | "European Union" | "United Kingdom" | "Japan" | "Worldwide";
  genes: string;         // comma separated
  keywords: string;      // free text
};

type TrialRow = {
  nctId: string;
  title: string;
  phase: string;
  status: string;
  city?: string;
  country?: string;
};

const PHASES: Array<TrialFilters["phase"]> = ["Any","1","2","3","4"];

export default function TrialsDock() {
  const [filters, setFilters] = useState<TrialFilters>({
    condition: "",
    phase: "Any",
    status: "Any",
    country: "United States",
    genes: "",
    keywords: ""
  });
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<TrialRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  function upd<K extends keyof TrialFilters>(k: K, v: TrialFilters[K]) {
    setFilters(f => ({ ...f, [k]: v }));
  }

  async function onSearch(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/trials/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(filters),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRows(data?.rows ?? []);
    } catch (err: any) {
      setError(err?.message || "Search failed");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <form onSubmit={onSearch} className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Phase:</span>
          {PHASES.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => upd("phase", p)}
              className={`px-2 py-1 rounded border text-sm ${filters.phase === p ? "bg-blue-600 text-white border-blue-600" : "border-gray-300"}`}
            >
              {p}
            </button>
          ))}
        </div>

        <select
          value={filters.status}
          onChange={(e) => upd("status", e.target.value as TrialFilters["status"])}
          className="border rounded px-2 py-1 text-sm"
        >
          <option>Any</option>
          <option>Recruiting</option>
          <option>Completed</option>
          <option>Active, not recruiting</option>
        </select>

        <div className="flex gap-1">
          {(["United States","India","European Union","United Kingdom","Japan","Worldwide"] as TrialFilters["country"][]).map(c => (
            <button
              key={c}
              type="button"
              onClick={() => upd("country", c)}
              className={`px-2 py-1 rounded border text-sm ${filters.country === c ? "bg-blue-600 text-white border-blue-600" : "border-gray-300"}`}
            >
              {c.replace("European Union","EU").replace("United Kingdom","UK")}
            </button>
          ))}
        </div>

        <input
          value={filters.condition}
          onChange={(e) => upd("condition", e.target.value)}
          placeholder="Condition (e.g., leukemia)"
          className="border rounded px-2 py-1 text-sm min-w-[220px]"
        />
        <input
          value={filters.genes}
          onChange={(e) => upd("genes", e.target.value)}
          placeholder="Genes (comma separated)"
          className="border rounded px-2 py-1 text-sm min-w-[220px]"
        />
        <input
          value={filters.keywords}
          onChange={(e) => upd("keywords", e.target.value)}
          placeholder="Keywords (e.g., EGFR India Ph3)"
          className="border rounded px-2 py-1 text-sm min-w-[260px]"
        />

        <button
          type="submit"
          disabled={loading}
          className="px-3 py-1 rounded bg-blue-600 text-white text-sm disabled:opacity-60"
        >
          {loading ? "Searching…" : "Search Trials"}
        </button>
      </form>

      <div className="mt-3 text-sm text-gray-500">
        {error && <div className="text-red-600">Error: {error}</div>}
        {!error && !loading && rows.length === 0 && <div>No trials found. Try removing a filter or switching country.</div>}
      </div>

      {rows.length > 0 && (
        <div className="mt-4 overflow-auto border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left p-2">NCT ID</th>
                <th className="text-left p-2">Title</th>
                <th className="text-left p-2">Phase</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">City</th>
                <th className="text-left p-2">Country</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.nctId} className="border-t">
                  <td className="p-2">
                    <a className="text-blue-600 underline" href={`https://clinicaltrials.gov/study/${r.nctId}`} target="_blank">{r.nctId}</a>
                  </td>
                  <td className="p-2">{r.title}</td>
                  <td className="p-2">{r.phase || "-"}</td>
                  <td className="p-2">{r.status || "-"}</td>
                  <td className="p-2">{r.city || "-"}</td>
                  <td className="p-2">{r.country || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

