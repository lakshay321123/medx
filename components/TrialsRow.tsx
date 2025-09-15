import * as React from 'react';
import type { TrialRow } from '@/types/trials';
import { registryIdLabel } from '@/lib/registry';

function useIsDoctor() {
  if (typeof window === 'undefined') return false;
  const mode = new URLSearchParams(window.location.search).get('mode');
  return mode === 'doctor';
}

export function TrialsRow({ row }: { row: TrialRow }) {
  const isDoctor = useIsDoctor();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [brief, setBrief] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);

  const onSummarize = async (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.button === 1) return;
    e.preventDefault();
    if (!isDoctor) return;

    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/trials/${row.id}/summary`, { cache: 'no-store' });
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      setBrief(j);
    } catch (err: any) {
      setError(err.message || 'Unable to summarize');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <tr className="hover:bg-muted/50">
        <td className="border px-2 py-1 whitespace-nowrap align-top">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500">{registryIdLabel(row.source)}</span>
            <a
              href={row.url || `https://clinicaltrials.gov/study/${row.id}`}
              onClick={onSummarize}
              className={isDoctor ? 'underline decoration-dotted hover:decoration-solid' : 'underline'}
            >
              {row.id}
            </a>
          </div>
        </td>
        <td className="border px-2 py-1 align-top min-w-[24rem]">{row.title}</td>
        <td className="border px-2 py-1 whitespace-nowrap align-top">{row.phase || '—'}</td>
        <td className="border px-2 py-1 whitespace-nowrap align-top">{row.status || '—'}</td>
        <td className="border px-2 py-1 whitespace-nowrap align-top">{row.country || '—'}</td>
      </tr>

      {open && (
        <aside className="fixed right-0 top-0 h-full w-[480px] bg-background shadow-2xl p-4 overflow-y-auto z-50">
          <button className="float-right" onClick={() => setOpen(false)}>✕</button>
          <h3 className="text-lg font-semibold mb-2">{row.id} — Doctor Brief</h3>

          {loading && <p className="opacity-70">Summarizing…</p>}
          {error && <p className="text-red-600">{error}</p>}

          {brief && (
            <div className="space-y-2">
              <p><b>TL;DR:</b> {brief.tldr}</p>
              <ul className="list-disc pl-5">
                {(brief.bullets || []).slice(0,3).map((b:string,i:number)=><li key={i}>{b}</li>)}
              </ul>
              <div className="space-y-1 text-sm">
                <div><b>Design:</b> {brief.details?.design}</div>
                <div><b>Population:</b> {brief.details?.population}</div>
                <div><b>Interventions:</b> {brief.details?.interventions}</div>
                <div><b>Primary outcomes:</b> {brief.details?.primary_outcomes}</div>
                <div><b>Key eligibility:</b> {brief.details?.key_eligibility}</div>
              </div>
              {!!brief.citations?.length && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {brief.citations.slice(0,5).map((c:any,i:number)=>(
                    <a key={i} href={c.url} target="_blank" rel="noreferrer" className="underline text-sm">
                      [{i+1}] {c.title || new URL(c.url).hostname}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </aside>
      )}
    </>
  );
}

export default TrialsRow;
