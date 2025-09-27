"use client";
import { useEffect, useRef, useState } from "react";

export default function AddressPicker({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (opt: { label: string; lat: number; lng: number }) => void;
}) {
  const [q, setQ] = useState(value);
  const [opts, setOpts] = useState<{ label: string; lat: number; lng: number }[]>([]);
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<number | null>(null);

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
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, { cache: "no-store" });
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
  }, [q]);

  return (
    <div className="relative w-full">
      <input
        className="w-full h-10 rounded-xl border border-slate-200 bg-white/90 px-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-slate-300 focus:outline-none dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-100"
        placeholder="Enter area, city, or address"
        value={q}
        onChange={(event) => setQ(event.target.value)}
        onFocus={() => q && setOpen(true)}
      />
      {open && opts.length > 0 && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-white/10 dark:bg-slate-900">
          {opts.map((option) => (
            <button
              key={`${option.label}-${option.lat}-${option.lng}`}
              onClick={() => {
                onSelect(option);
                setQ(option.label);
                setOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
