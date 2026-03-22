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
        className="h-[34px] w-full rounded-[10px] border border-so-border bg-so-card px-3 text-[12px] text-so-text placeholder:text-so-muted shadow-sm transition focus:border-so-border focus:outline-none dark:border-so-border dark:bg-so-card/80 dark:text-so-text md:h-10 md:rounded-[10px] md:px-3 md:text-[13px] md:w-full md:max-w-full md:overflow-x-auto md:whitespace-nowrap"
        placeholder={placeholder}
        value={q}
        onChange={(event) => setQ(event.target.value)}
        onFocus={() => q && setOpen(true)}
      />
      {open && opts.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-[8px] border border-so-border bg-white/95 shadow-lg backdrop-blur-sm dark:border-so-border dark:bg-[#131316] md:rounded-[12px]">
          {opts.map((option) => (
            <button
              key={`${option.label}-${option.lat}-${option.lng}`}
              onClick={() => {
                onSelect(option);
                setQ(option.label);
                setOpen(false);
              }}
              className="block w-full px-2.5 py-1.5 text-left text-[11px] text-so-text transition hover:bg-so-bg focus-visible:outline-none focus-visible:bg-so-bg dark:text-so-text dark:hover:bg-so-accent/10 dark:focus-visible:bg-so-accent/10 md:px-3 md:py-2 md:text-[12.5px]"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
