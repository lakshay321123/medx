'use client';
import { useState } from 'react';
import { useResearchFilters } from '@/store/researchFilters';
import type { TrialRow } from '@/types/trials';

const phaseOptions = ['1','2','3','4'] as const;
const statusLabels = [
  { key: 'recruiting', api: 'Recruiting', label: 'Recruiting' },
  { key: 'active', api: 'Active, not recruiting', label: 'Active (not recruiting)' },
  { key: 'completed', api: 'Completed', label: 'Completed' },
  { key: 'any', api: undefined, label: 'Any' },
] as const;

const countryOptions = [
  'United States',
  'India',
  'European Union',
  'United Kingdom',
  'Japan',
  'Worldwide',
] as const;

function mapStatusKeyToApi(key?: string) {
  if (!key || key === 'any') return undefined;
  const m = statusLabels.find(s => s.key === key);
  return m?.api;
}

type Props = {
  mode: 'patient'|'doctor'|'research'|'therapy';
  onResults?: (rows: TrialRow[]) => void; // ✅ parent (ChatPane) receives rows
};

export default function ResearchFilters({ mode, onResults }: Props) {
  const { filters, setFilters, reset } = useResearchFilters();

  const [local, setLocal] = useState({
    query: filters.query || '',
    phase: filters.phase || '',
    status: filters.status || 'recruiting',
    countries: filters.countries || [],
    genes: (filters.genes || []).join(', '),
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePhase = (p: string) =>
    setLocal(s => ({ ...s, phase: s.phase === p ? '' : p }));

  const toggleCountry = (name: string) =>
    setLocal(s => {
      const has = s.countries.includes(name);
      return { ...s, countries: has ? s.countries.filter(c => c !== name) : [...s.countries, name] };
    });

  function applyLocalToStore() {
    setFilters({
      query: local.query.trim() || undefined,
      phase: (local.phase as any) || undefined,
      status: (local.status as any) || 'recruiting',
      countries: local.countries,
      genes: local.genes.split(',').map(s => s.trim()).filter(Boolean),
    });
  }

  async function runSearch() {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        query: local.query.trim() || undefined,
        phase: (local.phase || undefined) as "1"|"2"|"3"|"4"|undefined,
        status: mapStatusKeyToApi(local.status),
        // single country for now: take first selected if any
        country: local.countries[0] || undefined,
        genes: local.genes
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    onResults?.([]); // clear table
  }

  const open = mode !== 'patient'; // keep previous behavior

  return (
    <form onSubmit={onSubmit} className="px-4 pt-3 pb-2">
      {/* Top-style search input + button */}
      <div className="flex items-center gap-2">
        <input
          value={local.query}
          onChange={(e)=>setLocal(s=>({ ...s, query: e.target.value }))}
          onKeyDown={(e)=> e.key === 'Enter' && (e.currentTarget as any).form?.requestSubmit()}
          placeholder="Search trials (e.g., condition, gene, topic)…"
          className="w-full rounded-lg border px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700"
        />
        <button
          type="submit"
          className="px-3 py-2 rounded-lg text-sm border bg-blue-600 text-white dark:border-blue-600 disabled:opacity-50"
          disabled={busy}
        >
          {busy ? 'Searching…' : 'Search'}
        </button>
      </div>

      {/* Phase chips */}
      <div className="mt-3 flex flex-wrap gap-2">
        {phaseOptions.map(p=>(
          <button
            key={p}
            type="button"
            onClick={()=>togglePhase(p)}
            className={`px-2 py-1 rounded border text-xs ${
              local.phase === p ? 'bg-blue-600 text-white border-blue-600' :
              'bg-white dark:bg-slate-800 dark:border-slate-700'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Status select */}
      <div className="mt-2">
        <select
          value={local.status}
          onChange={(e)=>setLocal(s=>({ ...s, status: e.target.value as any }))}
          className="rounded border px-2 py-1 text-sm dark:bg-slate-800 dark:border-slate-700"
        >
          {statusLabels.map(o=>(
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Country chips */}
      <div className="mt-2 flex flex-wrap gap-2">
        {countryOptions.map(name=>(
          <button
            key={name}
            type="button"
            onClick={()=>toggleCountry(name)}
            className={`px-2 py-1 rounded border text-xs ${
              local.countries.includes(name) ? 'bg-blue-600 text-white border-blue-600' :
              'bg-white dark:bg-slate-800 dark:border-slate-700'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Genes + Apply / Reset */}
      <div className="mt-3 flex items-center gap-2">
        <input
          placeholder="Genes (comma separated)"
          value={local.genes}
          onChange={(e)=>setLocal(s=>({ ...s, genes: e.target.value }))}
          className="flex-1 rounded border px-2 py-1 text-sm dark:bg-slate-800 dark:border-slate-700"
        />
        <button type="submit" className="px-3 py-1.5 rounded-lg text-sm border bg-blue-600 text-white dark:border-blue-600 disabled:opacity-50" disabled={busy}>
          {busy ? 'Searching…' : 'Apply'}
        </button>
        <button type="button" onClick={onReset} className="px-3 py-1.5 rounded-lg text-sm border">
          Reset
        </button>
      </div>

      {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
    </form>
  );
}

