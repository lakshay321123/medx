"use client";

import { useState } from "react";
import TrialsSearchBar from "@/components/TrialsSearchBar";
import ResearchFilters from "@/components/ResearchFilters";
import TrialsTable, { Trial } from "@/components/TrialsTable";
import { ResearchFiltersProvider } from "@/store/researchFilters";

export default function TrialsDock() {
  const [busy, setBusy] = useState(false);
  const [trials, setTrials] = useState<Trial[]>([]);

  async function doSearch(q: { condition: string; keywords?: string }) {
    try {
      setBusy(true);
      const r = await fetch("/api/trials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(q),
      });
      const data = await r.json();
      setTrials(data.trials || []);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="my-3">
      <TrialsSearchBar onSearch={doSearch} busy={busy} />
      <ResearchFiltersProvider>
        <ResearchFilters />
        <TrialsTable trials={trials} />
      </ResearchFiltersProvider>
    </div>
  );
}
