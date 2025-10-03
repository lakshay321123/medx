'use client';

import clsx from 'clsx';

export type AidocLab = {
  name: string;
  value: number | string | null;
  unit?: string | null;
  marker?: string | null;
  ideal?: string | null;
};

export type AidocReport = {
  date: string;
  summary: string;
  labs: AidocLab[];
};

export type AidocPatient = {
  name: string;
  age: number | null;
  sex?: string | null;
  predispositions: string[];
  medications: string[];
  symptoms: string[];
  conditions?: string[];
};

export type AidocViewerProps = {
  patient: AidocPatient | null | undefined;
  reports: AidocReport[];
  comparisons: Record<string, string>;
  summary?: string | null;
  nextSteps?: string[];
  className?: string;
};

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
  if (value.includes('borderline')) return 'text-amber-600 bg-amber-50 dark:bg-amber-500/20 dark:text-amber-100';
  if (value.includes('normal')) return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/20 dark:text-emerald-100';
  return 'text-slate-700 bg-slate-100 dark:bg-slate-700/40 dark:text-slate-100';
}

export function AidocReportViewer({
  patient,
  reports,
  comparisons,
  summary,
  nextSteps,
  className,
}: AidocViewerProps) {
  const hasComparisons = Object.keys(comparisons || {}).length > 0;
  const safeSummary = summary?.trim();
  const safeNextSteps = Array.isArray(nextSteps) ? nextSteps.filter(Boolean) : [];

  return (
    <div className={clsx('flex min-h-full flex-col gap-4', className)}>
      {patient && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Patient Info
          </div>
          <div className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-200">
            <div><span className="font-medium">Name:</span> {patient.name}</div>
            {patient.age != null && <div><span className="font-medium">Age:</span> {patient.age}</div>}
            {patient.predispositions.length > 0 && (
              <div>
                <span className="font-medium">Predispositions:</span> {patient.predispositions.join(', ')}
              </div>
            )}
            {Array.isArray(patient.conditions) && patient.conditions.length > 0 && (
              <div>
                <span className="font-medium">Conditions:</span> {patient.conditions.join(', ')}
              </div>
            )}
            {patient.medications.length > 0 && (
              <div>
                <span className="font-medium">Medications:</span> {patient.medications.join(', ')}
              </div>
            )}
            {patient.symptoms.length > 0 && (
              <div>
                <span className="font-medium">Symptoms:</span> {patient.symptoms.join(', ')}
              </div>
            )}
          </div>
        </div>
      )}

      {reports.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Reports
          </div>
          <div className="mt-3 space-y-2">
            {reports.map(report => (
              <details
                key={`${report.date}-${report.summary}`}
                className="group rounded-lg border border-slate-200/70 bg-slate-50/60 p-3 dark:border-slate-700/60 dark:bg-slate-900/60"
                open
              >
                <summary className="cursor-pointer text-sm font-medium text-slate-700 marker:text-slate-400 dark:text-slate-200">
                  <span className="mr-2 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Report Dated — {formatDateLabel(report.date)}
                  </span>
                </summary>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Summary: {report.summary}</div>
                {report.labs.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm">
                    {report.labs.map(lab => (
                      <li
                        key={`${report.date}-${lab.name}`}
                        className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200"
                      >
                        <div>
                          <div className="font-medium">{lab.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {lab.value ?? '—'} {lab.unit ?? ''}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={clsx('rounded-full px-2 py-0.5 text-xs font-semibold', markerClasses(lab.marker ?? 'normal'))}>
                            {lab.marker ?? 'Normal'}
                          </span>
                          {lab.ideal && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">Ideal: {lab.ideal}</span>
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
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Comparisons
          </div>
          <ul className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-200">
            {Object.entries(comparisons).map(([metric, text]) => (
              <li key={metric} className="rounded-lg bg-slate-50/70 px-3 py-2 dark:bg-slate-800/70">
                <span className="font-semibold">{metric}:</span> {text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {safeSummary && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            AI Summary
          </div>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{safeSummary}</p>
        </div>
      )}

      {safeNextSteps.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Next Steps
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
            {safeNextSteps.map((step, index) => (
              <li key={`${step}-${index}`}>{step}</li>
            ))}
          </ul>
        </div>
      )}

      {!reports.length && !safeSummary && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
          Ask AI Doc to pull your medical reports to see structured insights here.
        </div>
      )}
    </div>
  );
}

export default AidocReportViewer;
