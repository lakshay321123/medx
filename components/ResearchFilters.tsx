'use client';
import { useState } from 'react';
import { useResearchFilters, defaultFilters } from '@/store/researchFilters';

const phaseOptions = ['1','2','3','4'] as const;
const statusOptions = [
  { value: 'recruiting', label: 'Recruiting' },
  { value: 'active', label: 'Active (not recruiting)' },
  { value: 'completed', label: 'Completed' },
  { value: 'any', label: 'Any' },
];
const countryOptions = [
  'United States',
  'India',
  'European Union',
  'United Kingdom',
  'Japan',
  'Worldwide'
];
const geneSuggestions = ['EGFR','ALK','ROS1','BRAF','PD-L1','KRAS','HER2'];

function summaryCount(filters: any) {
  let n = 0;
  if (filters.phase) n++;
  if (filters.status && filters.status !== 'recruiting') n++;
  if (filters.countries?.length) n++;
  if (filters.genes?.length) n++;
  return n;
}

export default function ResearchFilters({ mode }: { mode: 'patient'|'doctor'|'research'|'therapy' }) {
  const { filters, setFilters, reset } = useResearchFilters();
  const [draft, setDraft] = useState(filters);
  const [open, setOpen] = useState(mode !== 'patient');
  const count = summaryCount(filters);

  function apply() {
    setFilters(draft);
    if (mode === 'patient') setOpen(false);
  }
  function doReset() {
    setDraft(defaultFilters);
    reset();
  }
  function toggleCountry(c: string) {
    const list = new Set(draft.countries || []);
    if (list.has(c)) list.delete(c); else list.add(c);
    setDraft({ ...draft, countries: Array.from(list) });
  }
  const geneInput = (draft.genes || []).join(', ');

  return (
    <div className="border-b border-slate-200 dark:border-gray-800 px-4 py-2">
      {mode === 'research' && (
        <button type="button" className="btn-secondary mb-2" onClick={() => setOpen(o=>!o)}>
          {open ? 'Hide filters' : `Refine results${count?` (${count})`:''}`}
        </button>
      )}
      {open && (
        <div className="flex flex-wrap gap-2 items-end text-sm">
          <div className="flex items-center gap-1">
            <span className="font-medium">Phase:</span>
            <div className="flex border rounded overflow-hidden">
              <button className={`px-2 py-1 ${!draft.phase?'bg-indigo-600 text-white':'bg-transparent'}`} onClick={()=>setDraft({...draft, phase: undefined})}>Any</button>
              {phaseOptions.map(p=> (
                <button key={p} className={`px-2 py-1 ${draft.phase===p?'bg-indigo-600 text-white':'bg-transparent'}`} onClick={()=>setDraft({...draft, phase:p})}> {p} </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-1">
            <span className="font-medium">Status:</span>
            <select className="border rounded px-2 py-1" value={draft.status || 'recruiting'} onChange={e=>setDraft({...draft, status: e.target.value as any})}>
              {statusOptions.map(o=> <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <div className="flex items-center gap-1">
            <span className="font-medium">Country:</span>
            <div className="flex flex-wrap gap-1">
              {countryOptions.map(c=> (
                <button key={c} type="button" className={`px-2 py-1 border rounded ${draft.countries?.includes(c)?'bg-indigo-600 text-white':'bg-transparent'}`} onClick={()=>toggleCountry(c)}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-1 flex-wrap">
            <span className="font-medium">Genes:</span>
            <input className="border rounded px-2 py-1" value={geneInput} placeholder="EGFR, ALK" onChange={e=>setDraft({...draft, genes: e.target.value.split(/\s*,\s*/).filter(Boolean)})} />
          </label>
          <div className="ml-auto flex items-center gap-2">
            <button className="btn-secondary" onClick={doReset}>Reset</button>
            <button className="btn-primary" onClick={apply}>Apply {count ? <span className="ml-1 rounded-full bg-indigo-600 text-white px-2">{count}</span> : null}</button>
          </div>
        </div>
      )}
    </div>
  );
}
