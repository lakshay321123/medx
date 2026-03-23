'use client';
import { useState } from 'react';
import { useResearchFilters } from '@/store/researchFilters';
import type { TrialRow } from '@/types/trials';
import { useT } from '@/components/hooks/useI18n';
import { PHASES, STATUSES, REGIONS } from '@/components/clinicalTrials.const';

type PhaseValue = (typeof PHASES)[number]['value'];
type StatusValue = (typeof STATUSES)[number]['value'];
type RegionValue = (typeof REGIONS)[number]['value'];

type LocalState = {
  query: string;
  phase: PhaseValue | '';
  status: StatusValue;
  countries: RegionValue[];
  genes: string;
};

const STATUS_API_MAP = new Map<StatusValue, (typeof STATUSES)[number]['apiValue']>(
  STATUSES.map(status => [status.value, status.apiValue]),
);

function mapStatusKeyToApi(key?: StatusValue) {
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

  const [local, setLocal] = useState<LocalState>({
    query: filters.query || '',
    phase: (filters.phase as PhaseValue | undefined) || '',
    status: (filters.status as StatusValue | undefined) || 'recruiting',
    countries: (filters.countries as RegionValue[] | undefined) || [],
    genes: (filters.genes || []).join(', '),
  });
  const [source, setSource] = useState<string>(filters.source || 'All');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePhase = (p: PhaseValue) =>
    setLocal(s => ({ ...s, phase: s.phase === p ? '' : p }));

  // Single-select country (clean & predictable)
  const toggleCountry = (name: RegionValue) =>
    setLocal(s => ({
      ...s,
      countries: s.countries.includes(name) ? [] : [name],
    }));

  function applyLocalToStore() {
    setFilters({
      query: local.query.trim() || undefined,
      phase: (local.phase || undefined) as PhaseValue | undefined,
      status: local.status,
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
        phase: (local.phase || undefined) as PhaseValue | undefined,
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

  const chipActive = "text-white border-[var(--so-accent,#06B6D4)] bg-[var(--so-accent,#06B6D4)] shadow-sm";
  const chipInactive = "bg-[var(--so-bg-secondary,#F2F2F7)] border-transparent text-[var(--so-text,#000)] hover:border-[var(--so-accent,#06B6D4)] dark:bg-[#2C2C2E] dark:text-white";
  const inputCls = "w-full rounded-xl border border-[var(--so-border,#E5E5EA)] bg-[var(--so-card,#fff)] px-3.5 py-2 text-sm outline-none transition focus:border-[var(--so-accent,#06B6D4)] dark:bg-[#1C1C1E] dark:border-[#2C2C2E] dark:text-white placeholder:text-[#8E8E93]";
  const selectCls = "rounded-xl border border-[var(--so-border,#E5E5EA)] bg-[var(--so-card,#fff)] px-3 py-1.5 text-xs outline-none dark:bg-[#1C1C1E] dark:border-[#2C2C2E] dark:text-white";

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl px-4 pt-4 pb-3">
      {/* Search bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            key={t.lang}
            value={local.query}
            onChange={(e) => setLocal(s => ({ ...s, query: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as any).form?.requestSubmit()}
            placeholder={t("Search trials (e.g., condition, gene, topic)")}
            className={inputCls}
          />
        </div>
        <button type="submit" disabled={busy}
          className="shrink-0 rounded-xl bg-[var(--so-accent,#06B6D4)] px-4 py-2 text-sm font-medium text-white transition hover:shadow-md disabled:opacity-50">
          {busy ? t("Searching") : t("Search")}
        </button>
      </div>

      {/* Filters row */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {/* Phase pills */}
        {PHASES.map(phase => (
          <button key={phase.value} type="button" onClick={() => togglePhase(phase.value)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${local.phase === phase.value ? chipActive : chipInactive}`}>
            {t(phase.labelKey)}
          </button>
        ))}

        <div className="h-4 w-px bg-[var(--so-border,#E5E5EA)] dark:bg-[#2C2C2E]" />

        {/* Status */}
        <select value={local.status} onChange={(e) => setLocal(s => ({ ...s, status: e.target.value as StatusValue }))} className={selectCls}>
          {STATUSES.map(o => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
        </select>

        {/* Source */}
        <select value={source} onChange={(e) => setSource(e.target.value)} className={selectCls}>
          <option>All</option><option>CTgov</option><option>EUCTR</option><option>CTRI</option><option>ISRCTN</option>
        </select>
      </div>

      {/* Country pills */}
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {REGIONS.map(region => (
          <button key={region.value} type="button" onClick={() => toggleCountry(region.value)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${local.countries.includes(region.value) ? chipActive : chipInactive}`}>
            {t(region.labelKey)}
          </button>
        ))}
      </div>

      {/* Genes + actions */}
      <div className="mt-3 flex items-center gap-2">
        <input placeholder={t("Genes (comma separated)")} value={local.genes}
          onChange={(e) => setLocal(s => ({ ...s, genes: e.target.value }))}
          className={"flex-1 " + inputCls} />
        <button type="button" onClick={onReset}
          className="shrink-0 rounded-xl border border-[var(--so-border,#E5E5EA)] dark:border-[#2C2C2E] px-3 py-2 text-xs font-medium text-[var(--so-text-secondary,#8E8E93)] transition hover:bg-[var(--so-bg-secondary,#F2F2F7)]">
          {t("Reset")}
        </button>
      </div>

      {error && <div className="mt-2 rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">{error}</div>}
    </form>
  );
}

