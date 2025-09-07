"use client";
import { useTrialsSearchStore } from "@/lib/research/useTrialsSearchStore";

const countryMap = {
  "United States": "US",
  India: "IN",
  "United Kingdom": "GB",
  Japan: "JP",
  "European Union": "EU",
  Worldwide: "WW",
} as const;

export default function FiltersBar({ onSearch }: { onSearch: () => void }) {
  const { phases, status, countries, genes, set, q } = useTrialsSearchStore();

  const togglePhase = (p: 1 | 2 | 3 | 4) =>
    set({ phases: phases.includes(p) ? phases.filter((x) => x !== p) : [...phases, p] });

  const toggleCountry = (label: keyof typeof countryMap) => {
    const iso = countryMap[label];
    set({ countries: countries.includes(iso) ? countries.filter((c) => c !== iso) : [...countries, iso] });
  };

  return (
    <div className="px-4 pt-3 pb-2">
      {/* phase chips */}
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4].map((p) => (
          <button
            key={p}
            onClick={() => togglePhase(p as 1 | 2 | 3 | 4)}
            className={`px-2 py-1 rounded border text-xs ${
              phases.includes(p as 1 | 2 | 3 | 4)
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white dark:bg-slate-800 dark:border-slate-700"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* status select */}
      <div className="mt-2">
        <select
          value={status}
          onChange={(e) => set({ status: e.target.value as any })}
          className="rounded border px-2 py-1 text-sm dark:bg-slate-800 dark:border-slate-700"
        >
          <option>Any</option>
          <option>Recruiting</option>
          <option>Active, not recruiting</option>
          <option>Completed</option>
          <option>Enrolling by invitation</option>
        </select>
      </div>

      {/* countries */}
      <div className="mt-2 flex flex-wrap gap-2">
        {(
          [
            "United States",
            "India",
            "European Union",
            "United Kingdom",
            "Japan",
            "Worldwide",
          ] as const
        ).map((lbl) => (
          <button
            key={lbl}
            onClick={() => toggleCountry(lbl)}
            className={`px-2 py-1 rounded border text-xs ${
              countries.includes(countryMap[lbl])
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white dark:bg-slate-800 dark:border-slate-700"
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          placeholder="Genes (comma separated)"
          defaultValue={genes.join(",")}
          onBlur={(e) =>
            set({ genes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
          }
          className="flex-1 rounded border px-2 py-1 text-sm dark:bg-slate-800 dark:border-slate-700"
        />
        <button
          onClick={onSearch}
          className="px-3 py-1.5 rounded-lg text-sm border bg-blue-600 text-white dark:border-blue-600"
        >
          Apply
        </button>
        <button
          onClick={() => set({ phases: [], status: "Any", countries: [], genes: [] })}
          className="px-3 py-1.5 rounded-lg text-sm border"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
