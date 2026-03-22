'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { useAidocStore } from '@/stores/useAidocStore';

function formatDateLabel(date: string) {
  if (!date || date === 'unknown') return 'Unknown date';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString();
}

function markerClasses(marker: string) {
  const value = marker.toLowerCase();
  if (value.includes('high')) return 'text-rose-600 bg-rose-50 dark:bg-rose-500/20 dark:text-rose-100';
  if (value.includes('low')) return 'text-amber-600 bg-amber-50 dark:bg-amber-500/20 dark:text-amber-100';
  if (value.includes('normal')) return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/20 dark:text-emerald-100';
  return 'text-so-text bg-so-bg dark:bg-so-card/40 dark:text-so-text';
}

export default function AiDocPane() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetForThread = useAidocStore(s => s.resetForThread);
  const structured = useAidocStore(s => s.structured);

  const threadId = searchParams.get('threadId');

  useEffect(() => {
    if (!threadId) {
      const saved = sessionStorage.getItem('aidoc_thread');
      if (saved) {
        router.push(`?panel=ai-doc&threadId=${saved}&context=profile`);
      } else {
        const id = `aidoc_${Date.now().toString(36)}`;
        sessionStorage.setItem('aidoc_thread', id);
        router.push(`?panel=ai-doc&threadId=${id}&context=profile`);
      }
    }
  }, [threadId, router]);

  useEffect(() => {
    if (!threadId) return;
    resetForThread(threadId);
  }, [threadId, resetForThread]);

  const hasComparisons = useMemo(() => Object.keys(structured.comparisons || {}).length > 0, [structured.comparisons]);

  return (
    <div className="flex min-h-full flex-col gap-4 p-4">
      {structured.patient && (
        <div className="rounded-xl border border-so-border bg-white p-4 shadow-sm dark:border-so-border dark:bg-so-card">
          <div className="text-sm font-semibold uppercase tracking-wide text-so-muted dark:text-so-muted">
            Patient Info
          </div>
          <div className="mt-2 space-y-1 text-sm text-so-text dark:text-so-text">
            <div><span className="font-medium">Name:</span> {structured.patient.name}</div>
            {structured.patient.age != null && <div><span className="font-medium">Age:</span> {structured.patient.age}</div>}
            {structured.patient.predispositions.length > 0 && (
              <div>
                <span className="font-medium">Conditions:</span> {structured.patient.predispositions.join(', ')}
              </div>
            )}
            {structured.patient.medications.length > 0 && (
              <div>
                <span className="font-medium">Medications:</span> {structured.patient.medications.join(', ')}
              </div>
            )}
            {structured.patient.symptoms.length > 0 && (
              <div>
                <span className="font-medium">Symptoms:</span> {structured.patient.symptoms.join(', ')}
              </div>
            )}
          </div>
        </div>
      )}

      {structured.reports.length > 0 && (
        <div className="rounded-xl border border-so-border bg-white p-4 shadow-sm dark:border-so-border dark:bg-so-card">
          <div className="text-sm font-semibold uppercase tracking-wide text-so-muted dark:text-so-muted">
            Reports
          </div>
          <div className="mt-3 space-y-2">
            {structured.reports.map(report => (
              <details key={report.date + report.summary} className="group rounded-lg border border-so-border/70 bg-so-bg/60 p-3 dark:border-so-border/60 dark:bg-so-card" open>
                <summary className="cursor-pointer text-sm font-medium text-so-text marker:text-so-muted dark:text-so-text">
                  <span className="mr-2 text-xs uppercase tracking-wide text-so-muted dark:text-so-muted">{formatDateLabel(report.date)}</span>
                  {report.summary}
                </summary>
                {report.labs.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm">
                    {report.labs.map(lab => (
                      <li key={`${report.date}-${lab.name}`} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-so-text shadow-sm dark:bg-so-card dark:text-so-text">
                        <div>
                          <div className="font-medium">{lab.name}</div>
                          <div className="text-xs text-so-muted dark:text-so-muted">
                            {lab.value ?? '—'} {lab.unit}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${markerClasses(lab.marker)}`}>
                            {lab.marker}
                          </span>
                          {lab.ideal && (
                            <span className="text-[11px] text-so-muted dark:text-so-muted">Ideal: {lab.ideal}</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            ))}
          </div>
        </div>
      )}

      {hasComparisons && (
        <div className="rounded-xl border border-so-border bg-white p-4 shadow-sm dark:border-so-border dark:bg-so-card">
          <div className="text-sm font-semibold uppercase tracking-wide text-so-muted dark:text-so-muted">
            Comparisons
          </div>
          <ul className="mt-2 space-y-1 text-sm text-so-text dark:text-so-text">
            {Object.entries(structured.comparisons).map(([metric, summary]) => (
              <li key={metric} className="rounded-lg bg-so-bg/70 px-3 py-2 dark:bg-so-card">
                <span className="font-semibold">{metric}:</span> {summary}
              </li>
            ))}
          </ul>
        </div>
      )}

      {structured.summary && (
        <div className="rounded-xl border border-so-border bg-white p-4 shadow-sm dark:border-so-border dark:bg-so-card">
          <div className="text-sm font-semibold uppercase tracking-wide text-so-muted dark:text-so-muted">
            AI Summary
          </div>
          <p className="mt-2 text-sm text-so-text dark:text-so-text">{structured.summary}</p>
        </div>
      )}

      {structured.nextSteps.length > 0 && (
        <div className="rounded-xl border border-so-border bg-white p-4 shadow-sm dark:border-so-border dark:bg-so-card">
          <div className="text-sm font-semibold uppercase tracking-wide text-so-muted dark:text-so-muted">
            Next Steps
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-so-text dark:text-so-text">
            {structured.nextSteps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ul>
        </div>
      )}

      {!structured.reports.length && !structured.summary && (
        <div className="rounded-xl border border-dashed border-so-border bg-so-bg p-6 text-center text-sm text-so-muted dark:border-so-border dark:bg-so-card dark:text-so-muted">
          Ask AI Doc to pull your medical reports to see structured insights here.
        </div>
      )}
    </div>
  );
}
