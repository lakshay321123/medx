"use client";
import { useMemo, useState } from "react";
import { useCountry } from "@/lib/country";
import { COUNTRIES } from "@/data/countries";
import { Globe2, Check } from "lucide-react";

export default function CountryGlobe() {
  const { country, setCountry } = useCountry();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return COUNTRIES;
    return COUNTRIES.filter(
      c =>
        c.name.toLowerCase().includes(query) ||
        c.code3.toLowerCase().includes(query)
    );
  }, [q]);

  return (
    <div className="relative">
      <button
        aria-label="Choose country"
        title={`Country: ${country.name} (${country.code3}) — click to change`}
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1 rounded-full border border-slate-300 dark:border-gray-700 bg-white/60 dark:bg-gray-900/60 px-3 py-1.5 text-sm shadow-sm hover:bg-white/80 dark:hover:bg-gray-900"
      >
        <Globe2 className="h-4 w-4" />
        <span className="font-medium">{country.code3}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Select country"
          className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl p-3 z-1200"
        >
          <div className="mb-2">
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search country or code…"
              className="w-full rounded-lg border border-slate-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500/50"
            />
          </div>

          <div className="max-h-64 overflow-auto pr-1">
            {list.map(c => (
              <button
                key={c.code3}
                onClick={() => {
                  setCountry(c.code3);
                  setOpen(false);
                }}
                className="w-full flex items-center justify-between rounded-lg px-2 py-2 hover:bg-slate-50 dark:hover:bg-gray-800"
              >
                <span className="flex items-center gap-2">
                  <span className="text-base">{c.flag}</span>
                  <span className="text-sm">{c.name}</span>
                </span>
                <span className="text-xs font-semibold tabular-nums">{c.code3}</span>
                {country.code3 === c.code3 && (
                  <Check className="h-4 w-4 text-teal-500" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
