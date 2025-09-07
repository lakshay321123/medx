"use client";

import { useState } from "react";
import type { TrialRow } from "@/types/trials";
import { searchTrials } from "@/lib/trials/api";

const phaseOptions = [1, 2, 3, 4];
const statusOptions = ["Recruiting", "Active", "Completed", "any"];
const countryOptions = [
  "United States",
  "India",
  "European Union",
  "United Kingdom",
  "Japan",
  "Worldwide",
];

export default function TrialsSearchBar({
  onTrials,
}: {
  onTrials?: (rows: TrialRow[]) => void;
}) {
  const [filters, setFilters] = useState<{
    condition: string;
    phase: number | "any";
    status: string | "any";
    country: string[];
    genes: string[];
  }>({
    condition: "",
    phase: "any",
    status: "any",
    country: [],
    genes: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function toggleCountry(c: string) {
    setFilters((prev) => {
      const set = new Set(prev.country);
      if (set.has(c)) set.delete(c); else set.add(c);
      return { ...prev, country: Array.from(set) };
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const trials = await searchTrials(filters);
      onTrials?.(trials);
    } catch (err: any) {
      console.error("[Trials] search error", err);
      setError(err.message || "Failed to fetch trials");
      onTrials?.([]);
    } finally {
      setIsLoading(false);
    }
  }

  const geneInput = filters.genes.join(", ");

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <input
          className="border rounded px-2 py-1"
          placeholder="Condition"
          value={filters.condition}
          onChange={(e) => update("condition", e.target.value)}
        />
        <div className="flex items-center gap-1">
          <span className="font-medium">Phase:</span>
          <div className="flex border rounded overflow-hidden">
            <button
              type="button"
              className={`px-2 py-1 ${filters.phase === "any" ? "bg-blue-600 text-white" : "bg-transparent"}`}
              onClick={() => update("phase", "any")}
            >
              Any
            </button>
            {phaseOptions.map((p) => (
              <button
                key={p}
                type="button"
                className={`px-2 py-1 ${filters.phase === p ? "bg-blue-600 text-white" : "bg-transparent"}`}
                onClick={() => update("phase", p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-1">
          <span className="font-medium">Status:</span>
          <select
            className="border rounded px-2 py-1"
            value={filters.status}
            onChange={(e) => update("status", e.target.value)}
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s === "any" ? "Any" : s}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-1">
          <span className="font-medium">Country:</span>
          <div className="flex flex-wrap gap-1">
            {countryOptions.map((c) => (
              <button
                key={c}
                type="button"
                className={`px-2 py-1 border rounded ${filters.country.includes(c) ? "bg-blue-600 text-white" : "bg-transparent"}`}
                onClick={() => toggleCountry(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-1 flex-wrap">
          <span className="font-medium">Genes:</span>
          <input
            className="border rounded px-2 py-1"
            placeholder="EGFR, ALK"
            value={geneInput}
            onChange={(e) => update("genes", e.target.value.split(/\s*,\s*/).filter(Boolean))}
          />
        </label>
        <button
          type="submit"
          className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? "Searching…" : "Search"}
        </button>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
    </form>
  );
}
