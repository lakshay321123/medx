"use client";
import { useTrialsSearchStore } from "@/lib/research/useTrialsSearchStore";

export default function TopBar() {
  const { q, set } = useTrialsSearchStore();
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b bg-white dark:bg-slate-900 sticky top-0 z-10">
      <input
        value={q}
        onChange={(e) => set({ q: e.target.value })}
        onKeyDown={(e) =>
          e.key === "Enter" &&
          document
            .getElementById("trials-search-btn")?
            .dispatchEvent(new Event("click", { bubbles: true }))
        }
        placeholder="Search trials (e.g., cancer, EGFR, melanoma)…"
        className="w-full rounded-lg border px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700"
      />
      <button
        id="trials-search-btn"
        className="px-3 py-2 rounded-lg text-sm border bg-blue-600 text-white dark:border-blue-600"
      >
        Search
      </button>
    </div>
  );
}
