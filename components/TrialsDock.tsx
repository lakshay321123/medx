"use client";

import { useState } from "react";
import TrialsSearchBar from "@/components/TrialsSearchBar";
import TrialsTable from "@/components/TrialsTable";
import { useResearchFilters } from "@/store/researchFilters";
import type { TrialRow } from "@/types/trials";

type FetchState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done" };

export default function TrialsDock() {
  const [status, setStatus] = useState<FetchState>({ kind: "idle" });
  const [rows, setRows] = useState<TrialRow[]>([]);
  const { filters } = useResearchFilters();

  // Map UI filters -> API strings
  function mapPhase(p?: string): string | undefined {
    if (!p) return undefined;
    if (p === "1" || p === "2" || p === "3" || p === "4") return `Phase ${p}`;
    return undefined;
  }
  function mapStatus(s?: string): string | undefined {
    if (!s || s === "any") return undefined;
    if (s.toLowerCase() === "recruiting") return "Recruiting";
    if (s.toLowerCase() === "active") return "Active, not recruiting";
    if (s.toLowerCase() === "completed") return "Completed";
    return undefined;
  }

  async function doSearch(keyword: string) {
    setStatus({ kind: "loading" });

    try {
      const phase = mapPhase((filters as any).phase);
      const status = mapStatus((filters as any).status);
      const countries: string[] = Array.isArray((filters as any).countries)
        ? (filters as any).countries
        : [];
      const country = countries.includes("Worldwide") ? undefined : countries[0];
      const genes =
        Array.isArray((filters as any).genes) && (filters as any).genes.length
          ? (filters as any).genes
          : undefined;

      const payload = {
        query: keyword || undefined,
        phase,
        status,
        country,
        genes,
      };

      const res = await fetch("/api/trials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(`Trials API ${res.status}: ${msg || "Request failed"}`);
      }

      const data = await res.json().catch(() => ({}));
      const all: TrialRow[] = Array.isArray(data?.trials) ? data.trials : [];

      setRows(all);
      setStatus({ kind: "done" });
    } catch (err: any) {
      setRows([]);
      setStatus({ kind: "error", message: err?.message || "Failed to fetch trials" });
    }
  }

  return (
    <div className="my-3">
      <TrialsSearchBar onSearch={doSearch} busy={status.kind === "loading"} />

      {status.kind === "error" && (
        <div className="text-red-600 text-sm my-2">
          {status.message}
        </div>
      )}

      {status.kind === "done" && rows.length === 0 && (
        <div className="text-gray-600 text-sm my-2">
          No trials found. Try removing a filter, switching country, or using broader keywords.
        </div>
      )}

      <TrialsTable rows={rows} />
    </div>
  );
}

