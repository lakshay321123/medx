"use client";

import { useState } from "react";
import TrialsSearchBar from "@/components/TrialsSearchBar";
import TrialsTable from "@/components/TrialsTable";
import { useResearchFilters } from "@/store/researchFilters";
import type { TrialRow } from "@/types/trials";

/**
 * Uses your existing /api/trials (GET) and the current filters store.
 * - Maps filter.phase "1|2|3|4" -> "Phase X" for ct.gov
 * - Maps status 'recruiting'|'active'|'completed' to ct.gov strings
 * - Uses first selected country (if any) for /api/trials
 * - Client-filters by genes against title+interventions
 */
export default function TrialsDock() {
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<TrialRow[]>([]);
  const { filters } = useResearchFilters();

  function mapPhase(p?: "1"|"2"|"3"|"4"): string | undefined {
    return p ? `Phase ${p}` : undefined;
  }
  function mapStatus(s?: string): string | undefined {
    if (!s || s === "any") return undefined;
    if (s === "recruiting") return "Recruiting";
    if (s === "active") return "Active, not recruiting";
    if (s === "completed") return "Completed";
    return undefined;
  }

  function geneMatch(r: TrialRow, genes?: string[]) {
    if (!genes || genes.length === 0) return true;
    const hay = `${r.title} ${r.interventions.join(" ")}`.toLowerCase();
    return genes.every((g) => hay.includes(g.toLowerCase()));
  }

  async function doSearch(q: { condition: string; keywords?: string }) {
    setBusy(true);
    try {
      const qs = new URLSearchParams();
      qs.set("condition", q.condition);
      const phase = mapPhase(filters.phase as any);
      const status = mapStatus(filters.status as any);
      const country = (filters.countries && filters.countries[0]) || undefined;

      if (phase) qs.set("phase", phase);
      if (status) qs.set("status", status);
      if (country) qs.set("country", country);
      qs.set("page", "1");
      qs.set("pageSize", "25");

      const r = await fetch(`/api/trials?${qs.toString()}`, { method: "GET" });
      const data = await r.json();
      const all: TrialRow[] = data.rows || [];

      // Apply client-side gene filter (and any extra keyword hints)
      const filtered = all.filter((t) => geneMatch(t, filters.genes));
      setRows(filtered);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="my-3">
      <TrialsSearchBar onSearch={doSearch} busy={busy} />
      {/* Filters UI already mounted at page layout / ChatPane (we'll gate below) */}
      <TrialsTable rows={rows} />
    </div>
  );
}

