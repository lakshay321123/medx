"use client";

import { useResearchFilters } from "@/store/researchFilters";
import type { Phase, Status } from "@/types/research-core";

const phaseOptions: Readonly<Phase[]> = ["1", "2", "3", "4"] as const;
const statusOptions: Readonly<Status[]> = ["Recruiting", "Completed"] as const;
const countryOptions = ["USA", "India", "EU", "Global"] as const;
const geneOptions = ["EGFR", "ALK", "KRAS", "Other"] as const;

export default function ResearchFilters() {
  const { filters, setFilters, reset } = useResearchFilters();

  return (
    <div className="flex flex-wrap gap-3 mb-4 p-2 border-b border-gray-200">
      <select
        value={filters.phase ?? ""}
        onChange={(e) => setFilters({ ...filters, phase: (e.target.value || undefined) as Phase | undefined })}
        className="border rounded px-2 py-1"
      >
        <option value="">All Phases</option>
        {phaseOptions.map((p) => (
          <option key={p} value={p}>Phase {p}</option>
        ))}
      </select>

      <select
        value={filters.status ?? ""}
        onChange={(e) => setFilters({ ...filters, status: (e.target.value || undefined) as Status | undefined })}
        className="border rounded px-2 py-1"
      >
        <option value="">Any Status</option>
        {statusOptions.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <select
        value={filters.country ?? ""}
        onChange={(e) => setFilters({ ...filters, country: e.target.value || undefined })}
        className="border rounded px-2 py-1"
      >
        <option value="">Any Country</option>
        {countryOptions.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <select
        value={filters.gene ?? ""}
        onChange={(e) => setFilters({ ...filters, gene: e.target.value || undefined })}
        className="border rounded px-2 py-1"
      >
        <option value="">Any Gene</option>
        {geneOptions.map((g) => (
          <option key={g} value={g}>{g}</option>
        ))}
      </select>

      <button onClick={reset} className="px-3 py-1 border rounded bg-gray-100">Reset</button>
    </div>
  );
}
