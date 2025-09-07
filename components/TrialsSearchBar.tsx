"use client";

import { useState } from "react";

export default function TrialsSearchBar({
  onSearch,
  busy,
}: {
  onSearch: (q: { condition: string; keywords?: string }) => void;
  busy?: boolean;
}) {
  const [condition, setCondition] = useState("");
  const [keywords, setKeywords] = useState("");

  return (
    <div className="flex flex-wrap gap-2 items-center mb-3">
      <input
        className="border rounded px-2 py-1 min-w-[240px]"
        placeholder="Cancer / condition (e.g., NSCLC)"
        value={condition}
        onChange={(e) => setCondition(e.target.value)}
      />
      <input
        className="border rounded px-2 py-1 min-w-[240px]"
        placeholder="Keywords (e.g., EGFR India Phase 3)"
        value={keywords}
        onChange={(e) => setKeywords(e.target.value)}
      />
      <button
        className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50"
        disabled={!condition || busy}
        onClick={() => onSearch({ condition, keywords: keywords || undefined })}
      >
        {busy ? "Searching…" : "Search Trials"}
      </button>
    </div>
  );
}

