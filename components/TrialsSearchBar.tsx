"use client";

import { useState } from "react";
import type { TrialRow } from "@/types/trials";

type Props = {
  onTrials?: (rows: TrialRow[]) => void;
};

export default function TrialsSearchBar({ onTrials }: Props) {
  const [keywords, setKeywords] = useState("");
  const [condition, setCondition] = useState("");
  const [phase, setPhase] = useState("");
  const [status, setStatus] = useState("");
  const [country, setCountry] = useState("");
  const [genesInput, setGenesInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const payload = {
      query: (keywords || condition || "").trim() || undefined,
      phase: phase && phase !== "Any" ? phase : undefined,
      status: status && status !== "Any" ? status : undefined,
      country: country && country !== "Any" ? country : undefined,
      genes: (genesInput || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    } as any;

    if (!payload.genes?.length) delete payload.genes;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/trials/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Search failed");
      }

      onTrials?.(data.trials || []);
    } catch (err: any) {
      console.error("[Trials] search error", err);
      setError(err.message || "Failed to fetch trials");
      onTrials?.([]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="border rounded px-2 py-1"
          placeholder="Keywords"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
        />
        <input
          className="border rounded px-2 py-1"
          placeholder="Condition"
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
        />
        <input
          className="border rounded px-2 py-1"
          placeholder="Phase"
          value={phase}
          onChange={(e) => setPhase(e.target.value)}
        />
        <input
          className="border rounded px-2 py-1"
          placeholder="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        />
        <input
          className="border rounded px-2 py-1"
          placeholder="Country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        />
        <input
          className="border rounded px-2 py-1"
          placeholder="Genes (comma separated)"
          value={genesInput}
          onChange={(e) => setGenesInput(e.target.value)}
        />
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

