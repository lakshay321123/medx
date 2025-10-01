"use client";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/hooks/useI18n";

export default function AddressPicker({
  value,
  onSelect,
  lang,
}: {
  value: string;
  onSelect: (opt: { label: string; lat: number; lng: number }) => void;
  lang: string;
}) {
  const [q, setQ] = useState(value);
  const [opts, setOpts] = useState<{ label: string; lat: number; lng: number }[]>([]);
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const t = useT();
  const placeholder = t("Enter area, city, or address");

  useEffect(() => {
    setQ(value);
  }, [value]);

  useEffect(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    if (!q) {
      setOpts([]);
      setOpen(false);
      return;
    }

    timeoutRef.current = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q, lang });
        const response = await fetch(`/api/geocode?${params.toString()}`, { cache: "no-store" });
        const json = await response.json();
        setOpts(json.data || []);
        setOpen(true);
      } catch (error) {
        setOpts([]);
      }
    }, 250);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [q, lang]);

  return (
    <div className="relative w-full min-w-0">
      <input
        className="h-[34px] w-full rounded-[10px] border border-slate-200 bg-white/90 px-3 text-[12px] text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-slate-300 focus:outline-none dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-100 md:h-10 md:rounded-[10px] md:px-3 md:text-[13px]"
        placeholder={placeholder}
        value={q}
        onChange={(event) => setQ(event.target.value)}
        onFocus={() => q && setOpen(true)}
      />
      {open && opts.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-[8px] border border-slate-200 bg-white/95 shadow-lg isolate backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/80 md:rounded-[12px]">
          {opts.map((option) => (
            <button
              key={`${option.label}-${option.lat}-${option.lng}`}
              onClick={() => {
                onSelect(option);
                setQ(option.label);
                setOpen(false);
              }}
              className="block w-full px-2.5 py-1.5 text-left text-[11px] text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:bg-slate-800 md:px-3 md:py-2 md:text-[12.5px]"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
