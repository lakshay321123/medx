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
        className="inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm font-medium text-[#0F172A] shadow-sm transition hover:border-[#2563EB] hover:text-[#2563EB] dark:border-[#1E3A5F] dark:bg-[#13233D] dark:text-[#E6EDF7] dark:hover:border-[#3B82F6] dark:hover:text-[#3B82F6]"
      >
        <Globe2 className="h-4 w-4" />
        <span className="tabular-nums">{country.code3}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Select country"
          className="absolute right-0 top-[110%] z-50 mt-2 w-72 rounded-xl border border-[#E2E8F0] bg-white/95 p-3 shadow-xl backdrop-blur dark:border-[#1E3A5F] dark:bg-[#0F1B2D]/95"
        >
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 dark:border-[#1E3A5F] dark:bg-[#13233D]">
            <Search className="h-4 w-4 text-[#64748B] dark:text-[#94A3B8]" />
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search country or code…"
              className="w-full bg-transparent text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none dark:text-[#E6EDF7] dark:placeholder:text-[#64748B]"
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
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[#E2E8F0]/60 dark:hover:bg-[#13233D]"
              >
                <span className="text-lg">{c.flag}</span>
                <div className="flex flex-1 items-center justify-between gap-3">
                  <span className="truncate text-sm text-[#0F172A] dark:text-[#E6EDF7]">{c.name}</span>
                  <span className="text-xs font-semibold tabular-nums text-[#64748B] dark:text-[#94A3B8]">{c.code3}</span>
                </div>
                {country.code3 === c.code3 && (
                  <Check className="h-4 w-4 text-[#2563EB] dark:text-[#3B82F6]" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
