"use client";

import { useState } from "react";

export default function TrialsSearchBar({
  onSearch,
  busy,
}: {
  onSearch: (query: string) => void;
  busy?: boolean;
}) {
  const [keyword, setKeyword] = useState("");

  return (
    <div className="flex flex-wrap gap-2 items-center mb-3">
      <input
        className="border rounded px-2 py-1 min-w-[240px]"
        placeholder="Keyword (e.g., leukemia)"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
      />
      <button
        className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50"
        disabled={!keyword || busy}
        onClick={() => onSearch(keyword)}
      >
        {busy ? "Searching…" : "Search Trials"}
      </button>
    </div>
  );
}

