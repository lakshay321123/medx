'use client';
import { useState } from 'react';
import { useResearchFilters } from '@/store/researchFilters';
import type { TrialRow } from '@/types/trials';
import { useT } from '@/components/hooks/useI18n';
import { PHASES, STATUSES, REGIONS } from '@/components/clinicalTrials.const';

const STATUS_API_MAP = new Map(STATUSES.map(status => [status.value, status.apiValue]));

function mapStatusKeyToApi(key?: string) {
  if (!key) return undefined;
  return STATUS_API_MAP.get(key);
}

type Props = {
  mode: 'patient'|'doctor'|'research'|'therapy';
  onResults?: (rows: TrialRow[]) => void; // ✅ parent (ChatPane) receives rows
};

export default function ResearchFilters({ mode, onResults }: Props) {
  const { filters, setFilters, reset } = useResearchFilters();
  const t = useT();

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

  // Single-select country (clean & predictable)
  const toggleCountry = (name: string) =>
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
    setSource('All');
    onResults?.([]); // clear table
  }

  const open = mode !== 'patient'; // keep previous behavior

  return (
    <form onSubmit={onSubmit} className="px-4 pt-3 pb-2">
      {/* Top-style search input + button */}
      <div className="flex items-center gap-2">
        <input
          key={t.lang}
          value={local.query}
          onChange={(e)=>setLocal(s=>({ ...s, query: e.target.value }))}
          onKeyDown={(e)=> e.key === 'Enter' && (e.currentTarget as any).form?.requestSubmit()}
          placeholder={t('Search trials (e.g., condition, gene, topic)…')}
          aria-label={t('Search trials (e.g., condition, gene, topic)…')}
          className="w-full rounded-lg border px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700"
        />
        <button
          type="submit"
          className="px-3 py-2 rounded-lg text-sm border bg-blue-600 text-white dark:border-blue-600 disabled:opacity-50"
          disabled={busy}
          aria-label={busy ? t('Searching…') : t('Search')}
        >
          {busy ? t('Searching…') : t('Search')}
        </button>
      </div>

      {/* Phase chips */}
      <div className="mt-3 flex flex-wrap gap-2">
        {PHASES.map(phase=>(
          <button
            key={phase.value}
            type="button"
            onClick={()=>togglePhase(phase.value)}
            className={`px-2 py-1 rounded border text-xs ${
              local.phase === phase.value ? 'bg-blue-600 text-white border-blue-600' :
              'bg-white dark:bg-slate-800 dark:border-slate-700'
            }`}
          >
            {t(phase.labelKey)}
          </button>
        ))}
      </div>

      {/* Status select */}
      <div className="mt-2">
        <select
          value={local.status}
          onChange={(e)=>setLocal(s=>({ ...s, status: e.target.value as any }))}
          className="rounded border px-2 py-1 text-sm dark:bg-slate-800 dark:border-slate-700"
          aria-label={t('Status')}
        >
          {STATUSES.map(option=>(
            <option key={option.value} value={option.value}>{t(option.labelKey)}</option>
          ))}
        </select>
      </div>

      {/* Source select */}
      <div className="mt-2">
        <select
          value={source}
          onChange={(e)=>setSource(e.target.value)}
          className="rounded border px-2 py-1 text-sm dark:bg-slate-800 dark:border-slate-700"
        >
          <option>All</option>
          <option>CTgov</option>
          <option>EUCTR</option>
          <option>CTRI</option>
          <option>ISRCTN</option>
        </select>
      </div>

      {/* Country chips */}
      <div className="mt-2 flex flex-wrap gap-2">
        {REGIONS.map(region=>(
          <button
            key={region.value}
            type="button"
            onClick={()=>toggleCountry(region.value)}
            className={`px-2 py-1 rounded border text-xs ${
              local.countries.includes(region.value) ? 'bg-blue-600 text-white border-blue-600' :
              'bg-white dark:bg-slate-800 dark:border-slate-700'
            }`}
          >
            {t(region.labelKey)}
          </button>
        ))}
      </div>

      {/* Genes + Apply / Reset */}
      <div className="mt-3 flex items-center gap-2">
        <input
          placeholder={t('Genes (comma separated)')}
          aria-label={t('Genes (comma separated)')}
          value={local.genes}
          onChange={(e)=>setLocal(s=>({ ...s, genes: e.target.value }))}
          className="flex-1 rounded border px-2 py-1 text-sm dark:bg-slate-800 dark:border-slate-700"
        />
        <button
          type="submit"
          className="px-3 py-1.5 rounded-lg text-sm border bg-blue-600 text-white dark:border-blue-600 disabled:opacity-50"
          disabled={busy}
          aria-label={busy ? t('Searching…') : t('Apply')}
        >
          {busy ? t('Searching…') : t('Apply')}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="px-3 py-1.5 rounded-lg text-sm border"
          aria-label={t('Reset')}
        >
          {t('Reset')}
        </button>
      </div>

      {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
    </form>
  );
}

