"use client";
import { useState, ChangeEvent, FormEvent } from "react";
import { useResearchFilters } from "@/store/researchFilters";
import type { Trial } from "@/lib/trials/search";

const phaseOptions = ['1','2','3','4'] as const;
const statusLabels = [
  { key: 'recruiting', api: 'Recruiting', label: 'Recruiting' },
  { key: 'active', api: 'Active, not recruiting', label: 'Active (not recruiting)' },
  { key: 'completed', api: 'Completed', label: 'Completed' },
  { key: 'any', api: undefined, label: 'Any' },
] as const;

// Add China, keep Worldwide (treated as no filter)
const countryOptions = [
  'United States',
  'India',
  'European Union',
  'United Kingdom',
  'Japan',
  'China',        // NEW
  'Worldwide',    // special: mapped to no filter
] as const;

function mapStatusKeyToApi(key?: string) {
  if (!key || key === 'any') return undefined;
  const m = statusLabels.find(s => s.key === key);
  return m?.api;
}

type Props = {
  mode: "patient" | "doctor" | "research" | "therapy";
  onResults?: (rows: Trial[]) => void;
  className?: string;
};

export default function ResearchFilters({ mode, onResults, className }: Props) {
  const { filters, setFilters, reset } = useResearchFilters();

  const [local, setLocal] = useState({
    query: filters.query || '',
    phase: filters.phase || '',
    status: filters.status || 'recruiting',
    countries: filters.countries || [],
    genes: (filters.genes || []).join(', '),
  });
  const [source, setSource] = useState<string>(filters.source || 'All');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePhase = (p: string) =>
    setLocal(s => ({ ...s, phase: s.phase === p ? '' : p }));

  const countriesSelectValue = local.countries.length === 0 ? ['ALL'] : local.countries;
  const selectedCountriesCount = local.countries.length === 0 ? 'All' : local.countries.length;

  function onCountriesChange(e: ChangeEvent<HTMLSelectElement>) {
    let values = Array.from(e.target.selectedOptions).map(o => o.value);
    if (values.length === 0 || values.includes('ALL')) {
      setLocal(s => ({ ...s, countries: [] }));
    } else {
      if (values.length > 1 && values.includes('Worldwide')) {
        values = values.filter(v => v !== 'Worldwide');
      }
      setLocal(s => ({ ...s, countries: values }));
    }
  }

  const toggleDesktopCountry = (name: string) =>
    setLocal(s => ({
      ...s,
      countries: s.countries.includes(name) ? [] : [name],
    }));

  function applyLocalToStore() {
    setFilters({
      query: local.query.trim() || undefined,
      phase: (local.phase as any) || undefined,
      status: (local.status as any) || 'recruiting',
      countries: local.countries,
      genes: local.genes.split(',').map(s => s.trim()).filter(Boolean),
      source,
    });
  }

  async function runSearch() {
    setBusy(true);
    setError(null);
    try {
      // Build payload (Worldwide -> undefined)
      const country = local.countries[0];
      const payload = {
        query: local.query.trim() || undefined,
        phase: (local.phase || undefined) as "1"|"2"|"3"|"4"|undefined,
        status: mapStatusKeyToApi(local.status),
        country: country === 'Worldwide' ? undefined : country,
        genes: local.genes.split(',').map(s => s.trim()).filter(Boolean),
        source,
      };

      const res = await fetch('/api/trials/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Search failed');
      onResults?.(data.trials || []);
    } catch (e:any) {
      setError(e.message || 'Failed to fetch trials');
      onResults?.([]);
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(e?: FormEvent) {
    if (e) e.preventDefault();
    applyLocalToStore();
    await runSearch();
  }

  function onReset() {
    reset();
    setLocal({
      query: '',
      phase: '',
      status: 'recruiting',
      countries: [],
      genes: '',
    });
    setSource('All');
    onResults?.([]); // clear table
  }

  const open = mode !== "patient";

  const baseClass = "mx-auto w-full max-w-[420px] space-y-3 md:max-w-none md:px-6";
  const formClassName = [baseClass, className].filter(Boolean).join(" ");

  return (
    <form onSubmit={handleSubmit} className={formClassName}>
      <section className="md:hidden space-y-2 px-3">
        <div className="flex items-center gap-2">
          <input
            value={local.query}
            onChange={(e) => setLocal(s => ({ ...s, query: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as any).form?.requestSubmit()}
            placeholder="Search trials (e.g., condition, gene, topic)…"
            className="input-sm w-[68%] min-w-[210px]"
            aria-label="Search trials"
          />
          <button
            type="submit"
            className="btn-sm w-[80px] shrink-0 flex items-center justify-center disabled:opacity-50"
            disabled={busy}
          >
            {busy ? "Searching…" : "Search"}
          </button>
        </div>

        <div className="overflow-x-auto no-scrollbar -mx-3 flex gap-1.5 px-3 md:hidden">
          {phaseOptions.map(p => {
            const active = local.phase === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => togglePhase(p)}
                className={`chip-sm inline-flex items-center justify-center whitespace-nowrap ${
                  active ? "border-white/60 bg-white/20" : ""
                }`}
                aria-pressed={active}
              >
                Phase {p}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={local.status}
            onChange={(e) => setLocal(s => ({ ...s, status: e.target.value as any }))}
            className="select-sm w-[160px]"
            aria-label="Filter by status"
          >
            {statusLabels.map(o => (
              <option key={o.key} value={o.key} className="text-slate-900">
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="select-sm w-[120px]"
            aria-label="Filter by source"
          >
            <option className="text-slate-900">All</option>
            <option className="text-slate-900">CTgov</option>
            <option className="text-slate-900">EUCTR</option>
            <option className="text-slate-900">CTRI</option>
            <option className="text-slate-900">ISRCTN</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="mobile-trial-countries">Countries</label>
          <select
            id="mobile-trial-countries"
            multiple
            value={countriesSelectValue}
            onChange={onCountriesChange}
            className="select-sm w-[240px]"
            aria-label="Countries"
          >
            <option value="ALL" className="text-slate-900">All countries</option>
            {countryOptions.map(name => (
              <option key={name} value={name} className="text-slate-900">
                {name}
              </option>
            ))}
          </select>
          <span className="text-[11px] text-white/70">{selectedCountriesCount} selected</span>
        </div>

        <div className="flex items-center gap-2">
          <input
            placeholder="Genes (comma separated)"
            value={local.genes}
            onChange={(e) => setLocal(s => ({ ...s, genes: e.target.value }))}
            className="input-sm w-[68%] min-w-[210px]"
            aria-label="Filter by genes"
          />
          <button
            type="button"
            className="btn-sm w-[80px] shrink-0 flex items-center justify-center disabled:opacity-50"
            onClick={() => {
              void handleSubmit();
            }}
            disabled={busy}
          >
            {busy ? "Searching…" : "Apply"}
          </button>
        </div>

        <div className="flex justify-end md:hidden">
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-white/70 underline decoration-dotted underline-offset-2"
          >
            Reset filters
          </button>
        </div>

        {error && <div className="text-xs text-rose-200">{error}</div>}
      </section>

      <div className="hidden md:block rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              value={local.query}
              onChange={(e) => setLocal(s => ({ ...s, query: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as any).form?.requestSubmit()}
              placeholder="Search trials (e.g., condition, gene, topic)…"
              className="w-full rounded-lg border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            <button
              type="submit"
              className="rounded-lg border bg-blue-600 px-3 py-2 text-sm text-white dark:border-blue-600 disabled:opacity-50"
              disabled={busy}
            >
              {busy ? "Searching…" : "Search"}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {phaseOptions.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => togglePhase(p)}
                className={`rounded border px-2 py-1 text-xs ${
                  local.phase === p
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
                }`}
              >
                Phase {p}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={local.status}
              onChange={(e) => setLocal(s => ({ ...s, status: e.target.value as any }))}
              className="rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              {statusLabels.map(o => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option>All</option>
              <option>CTgov</option>
              <option>EUCTR</option>
              <option>CTRI</option>
              <option>ISRCTN</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            {countryOptions.map(name => (
              <button
                key={name}
                type="button"
                onClick={() => toggleDesktopCountry(name)}
                className={`rounded border px-2 py-1 text-xs ${
                  local.countries.includes(name)
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
                }`}
              >
                {name}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              placeholder="Genes (comma separated)"
              value={local.genes}
              onChange={(e) => setLocal(s => ({ ...s, genes: e.target.value }))}
              className="flex-1 rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            <button
              type="submit"
              className="rounded-lg border bg-blue-600 px-3 py-1.5 text-sm text-white dark:border-blue-600 disabled:opacity-50"
              disabled={busy}
            >
              {busy ? "Searching…" : "Apply"}
            </button>
            <button type="button" onClick={onReset} className="rounded-lg border px-3 py-1.5 text-sm">
              Reset
            </button>
          </div>

          {open && (
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Informational only; not medical advice. Confirm eligibility with the sponsor.
            </div>
          )}

          {error && <div className="text-sm text-rose-600 dark:text-rose-400">{error}</div>}
        </div>
      </div>
    </form>
  );
}

