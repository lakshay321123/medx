"use client";
import { useMemo, useState } from "react";
import { useCountry } from "@/lib/country";
import { COUNTRIES } from "@/data/countries";
import { Globe2, Check, Search } from "lucide-react";

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
        className="inline-flex items-center gap-2 rounded-full border border-[var(--so-border,#E5E5EA)] pl-3 pr-6 py-1.5 text-sm font-medium transition text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)] dark:border-[var(--so-border,#2C2C2E)]"
      >
        <Globe2 className="h-4 w-4" />
        <span className="tabular-nums">{country.code3}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Select country"
          className="absolute right-0 top-[110%] z-50 mt-2 w-72 rounded-xl border border-black/10 bg-white/95 p-3 shadow-xl backdrop-blur dark:border-white/10 dark:bg-[#1C1C1E]/95"
        >
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-[var(--so-border,#E5E5EA)] bg-[var(--so-card,#fff)] px-3 py-1.5 dark:border-[var(--so-border,#2C2C2E)] dark:bg-[var(--so-card,#1C1C1E)]">
            <Search className="h-4 w-4 text-[var(--so-text-secondary,#8E8E93)]" />
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search country or code…"
              className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
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
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[var(--so-bg-secondary,#F2F2F7)] dark:hover:bg-[#2C2C2E]"
              >
                <span className="text-lg">{c.flag}</span>
                <div className="flex flex-1 items-center justify-between gap-3">
                  <span className="truncate text-sm">{c.name}</span>
                  <span className="text-xs font-semibold tabular-nums text-[var(--so-text-secondary,#8E8E93)]">{c.code3}</span>
                </div>
                {country.code3 === c.code3 && (
                  <Check className="h-4 w-4 text-[var(--so-accent,#06B6D4)]" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
