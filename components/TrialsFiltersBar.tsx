"use client";
import { useResearchFilters } from "@/store/researchFilters";

export default function TrialsFiltersBar() {
  const { filters, setFilters, reset } = useResearchFilters();

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <select
        value={filters.phase || ""}
        onChange={(e) => setFilters({ ...filters, phase: e.target.value })}
      >
        <option value="">All Phases</option>
        <option value="I">Phase I</option>
        <option value="II">Phase II</option>
        <option value="III">Phase III</option>
        <option value="IV">Phase IV</option>
      </select>

      <select
        value={filters.status || ""}
        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
      >
        <option value="">All Status</option>
        <option value="recruiting">Recruiting</option>
        <option value="completed">Completed</option>
      </select>

      <input
        placeholder="Country"
        value={filters.country || ""}
        onChange={(e) => setFilters({ ...filters, country: e.target.value })}
      />

      <input
        placeholder="Gene / Mutation"
        value={filters.gene || ""}
        onChange={(e) => setFilters({ ...filters, gene: e.target.value })}
      />

      <button onClick={reset}>Reset</button>
    </div>
  );
}
