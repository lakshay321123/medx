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
        className="inline-flex items-center gap-2 rounded-full border border-so-border bg-so-card pl-3 pr-6 py-1.5 text-sm font-medium text-so-text shadow-sm transition hover:bg-white dark:border-so-border dark:bg-so-card dark:text-so-text dark:hover:bg-so-accent/10"
      >
        <Globe2 className="h-4 w-4" />
        <span className="tabular-nums">{country.code3}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Select country"
          className="absolute right-0 top-[110%] z-50 mt-2 w-72 rounded-xl border border-so-border bg-white/95 p-3 shadow-xl backdrop-blur dark:border-so-border dark:bg-[#131316]"
        >
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-so-border bg-so-card px-3 py-1.5 dark:border-so-border dark:bg-so-card">
            <Search className="h-4 w-4 text-so-muted dark:text-so-muted" />
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search country or code…"
              className="w-full bg-transparent text-sm text-so-text placeholder:text-so-muted focus:outline-none dark:text-so-text dark:placeholder:text-so-muted"
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
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-so-bg dark:hover:bg-so-accent/10"
              >
                <span className="text-lg">{c.flag}</span>
                <div className="flex flex-1 items-center justify-between gap-3">
                  <span className="truncate text-sm">{c.name}</span>
                  <span className="text-xs font-semibold tabular-nums text-so-muted dark:text-so-muted">{c.code3}</span>
                </div>
                {country.code3 === c.code3 && (
                  <Check className="h-4 w-4 text-so-accent" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
