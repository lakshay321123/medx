"use client";

import { useState } from "react";
import TrialsSearchBar from "@/components/TrialsSearchBar";
import TrialsTable from "@/components/TrialsTable";
import type { TrialRow } from "@/types/trials";

export default function TrialsDock() {
  const [rows, setRows] = useState<TrialRow[]>([]);
  const [searched, setSearched] = useState(false);

  function handleTrials(trials: TrialRow[]) {
    setRows(trials);
    setSearched(true);
  }

  return (
    <div className="my-3">
      <TrialsSearchBar onTrials={handleTrials} />

      {searched && rows.length === 0 && (
        <div className="text-gray-600 text-sm my-2">
          No trials found. Try removing a filter, switching country, or using broader keywords.
        </div>
      )}

      {rows.length > 0 && <TrialsTable rows={rows} />}
    </div>
  );
}

