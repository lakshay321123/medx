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

  // Client-side gene match (safe/lenient)
  function geneMatch(r: TrialRow, genes?: string[]) {
    if (!genes || genes.length === 0) return true;
    const hay = `${r.title} ${r.interventions?.join(" ") ?? ""}`.toLowerCase();
    // lenient: at least one gene must appear
    return genes.some((g) => hay.includes(g.toLowerCase()));
  }

  async function doSearch(q: { condition: string; keywords?: string }) {
    setStatus({ kind: "loading" });

    try {
      const qs = new URLSearchParams();

      // Required
      qs.set("condition", q.condition.trim());

      // Include keywords (from bar) + genes (if any) together
      const genePhrase =
        Array.isArray((filters as any).genes) && (filters as any).genes.length
          ? (filters as any).genes.join(", ")
          : undefined;

      const mergedKeywords = [q.keywords?.trim(), genePhrase?.trim()]
        .filter(Boolean)
        .join(" ")
        .trim();

      if (mergedKeywords) qs.set("keywords", mergedKeywords);

      // Optional mapped filters
      const phase = mapPhase((filters as any).phase);
      const status = mapStatus((filters as any).status);
      // If user selected "Worldwide", omit country param
      const countries: string[] = Array.isArray((filters as any).countries)
        ? (filters as any).countries
        : [];
      const country = countries.includes("Worldwide")
        ? undefined
        : countries[0];

      if (phase) qs.set("phase", phase);
      if (status) qs.set("status", status);
      if (country) qs.set("country", country);

      // Pagination defaults
      qs.set("page", "1");
      qs.set("pageSize", "25");

      // Hit API
      const res = await fetch(`/api/trials?${qs.toString()}`, { method: "GET" });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(`Trials API ${res.status}: ${msg || "Request failed"}`);
      }

      const data = await res.json().catch(() => ({}));
      const all: TrialRow[] = Array.isArray(data?.rows) ? data.rows : [];

      // Apply lenient gene filter only if genes explicitly provided
      const final =
        Array.isArray((filters as any).genes) && (filters as any).genes.length
          ? all.filter((t) => geneMatch(t, (filters as any).genes))
          : all;

      setRows(final);
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

