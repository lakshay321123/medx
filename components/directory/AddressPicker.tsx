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
  const t = useRef<number | null>(null);

  useEffect(() => {
    if (t.current) window.clearTimeout(t.current);
    if (!q) {
      setOpts([]);
      return;
    }
    t.current = window.setTimeout(async () => {
      try {
        const r = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        const j = await r.json();
        setOpts(j.data || []);
        setOpen(true);
      } catch {
        setOpts([]);
        setOpen(false);
      }
    }, 250);
    return () => {
      if (t.current) window.clearTimeout(t.current);
    };
  }, [q]);

  return (
    <div className="relative w-full">
      <input
        className="w-full h-10 rounded-lg border border-slate-200 bg-white/95 px-2.5 text-[13px] leading-5 text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-slate-300 focus:outline-none dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-100"
        placeholder="Enter area or address"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => q && setOpen(true)}
      />
      {open && opts.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-44 w-full overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-slate-900">
          {opts.map((o) => (
            <button
              key={`${o.label}-${o.lat}-${o.lng}`}
              onClick={() => {
                onSelect(o);
                setQ(o.label);
                setOpen(false);
              }}
              className="block w-full truncate px-2 py-1.5 text-left text-[12.5px] hover:bg-slate-50 dark:hover:bg-slate-800"
              title={o.label}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
