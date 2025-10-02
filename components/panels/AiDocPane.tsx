'use client';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import PanelLoader from '@/components/mobile/PanelLoader';
import { useTimeline, useProfile } from '@/lib/hooks/useAppData';
import { pushToast } from '@/lib/ui/toast';
import { useAidocStore } from '@/stores/useAidocStore';

type MarkerCode = 'HH' | 'H' | 'LL' | 'L';
type PanelKey = 'liver' | 'glucose' | 'lipids' | 'renalIron' | 'inflammation' | 'other';

type ObservationFileRef = {
  upload_id?: string | null;
  bucket?: string | null;
  path?: string | null;
  name?: string | null;
};

type RawObservation = {
  id?: string;
  kind?: string | null;
  name?: string | null;
  name_display?: string | null;
  value_num?: number | null;
  value_text?: string | null;
  unit?: string | null;
  flags?: string[] | string | null;
  observed_at?: string | null;
  uploaded_at?: string | null;
  meta?: Record<string, any> | null;
  file?: ObservationFileRef | null;
};

type Marker = {
  code: MarkerCode;
  label: string;
};

type NormalizedObservation = {
  canonicalKey: string;
  displayName: string;
  shortLabel: string;
  highlightLabel: string;
  panel: PanelKey;
  value: string;
  unit: string | null;
  marker: Marker | null;
  sortKey: string;
  raw: RawObservation;
};

type TimelineDay = {
  isoDate: string;
  date: Date;
  displayDate: string;
  highlights: string[];
  panels: Record<PanelKey, NormalizedObservation[]>;
  files: ObservationFileRefWithLabel[];
};

type ObservationFileRefWithLabel = ObservationFileRef & { key: string; label: string };

type TimelineSummary = {
  totalReports: number;
  lastUploadLabel: string | null;
  breakdown: { label: string; count: number }[];
};

type TimelineDisplay = {
  days: TimelineDay[];
  summary: TimelineSummary;
};

const PANEL_CONFIG: Record<PanelKey, { label: string; join: 'dot' | 'comma' }> = {
  liver: { label: 'Liver', join: 'dot' },
  glucose: { label: 'Glucose', join: 'dot' },
  lipids: { label: 'Lipids', join: 'dot' },
  renalIron: { label: 'Renal/Iron', join: 'dot' },
  inflammation: { label: 'Inflammation', join: 'dot' },
  other: { label: 'Other tests', join: 'comma' },
};

const PANEL_ORDER: PanelKey[] = ['liver', 'glucose', 'lipids', 'renalIron', 'inflammation', 'other'];

type CanonicalConfig = {
  key: string;
  display: string;
  short?: string;
  highlight?: string;
  panel: PanelKey;
  synonyms: string[];
};

const CANONICAL_TESTS: CanonicalConfig[] = [
  {
    key: 'alt',
    display: 'ALT (SGPT)',
    panel: 'liver',
    synonyms: ['alt', 'sgpt', 'alanineaminotransferase', 'alanine_transaminase', 'alanine-aminotransferase', 'alt(sgpt)', 'sgptalt'],
  },
  {
    key: 'ast',
    display: 'AST (SGOT)',
    panel: 'liver',
    synonyms: ['ast', 'sgot', 'aspartateaminotransferase', 'aspartate_transaminase', 'aspartate-aminotransferase', 'ast(sgot)', 'sgotast'],
  },
  {
    key: 'alp',
    display: 'ALP',
    panel: 'liver',
    synonyms: ['alp', 'alkalinephosphatase', 'alkaline_phosphatase', 'alkaline-phosphatase'],
  },
  {
    key: 'fasting_glucose',
    display: 'Fasting Glucose',
    short: 'Fasting Glucose',
    panel: 'glucose',
    synonyms: ['fastingglucose', 'fpg', 'fastingbloodsugar', 'fasting_plasma_glucose', 'fbs'],
  },
  {
    key: 'hba1c',
    display: 'HbA1c',
    panel: 'glucose',
    synonyms: ['hba1c', 'glycatedhemoglobin', 'glycosylatedhemoglobin', 'a1c'],
  },
  {
    key: 'total_cholesterol',
    display: 'Total Cholesterol',
    short: 'Total',
    panel: 'lipids',
    synonyms: ['totalcholesterol', 'cholesteroltotal', 'cholesterol', 'totalchol'],
  },
  {
    key: 'ldl',
    display: 'LDL Cholesterol',
    short: 'LDL',
    panel: 'lipids',
    synonyms: ['ldl', 'ldlcholesterol', 'ldl-c', 'ldl_c', 'lowdensitylipoprotein'],
  },
  {
    key: 'hdl',
    display: 'HDL Cholesterol',
    short: 'HDL',
    panel: 'lipids',
    synonyms: ['hdl', 'hdlcholesterol', 'hdl-c', 'hdl_c', 'highdensitylipoprotein'],
  },
  {
    key: 'triglycerides',
    display: 'Triglycerides',
    panel: 'lipids',
    synonyms: ['triglycerides', 'tg', 'triglyceride'],
  },
  {
    key: 'egfr',
    display: 'eGFR',
    panel: 'renalIron',
    synonyms: ['egfr', 'estimatedglomerularfiltrationrate', 'glomerularfiltrationrate'],
  },
  {
    key: 'tibc',
    display: 'TIBC',
    panel: 'renalIron',
    synonyms: ['tibc', 'totalironbindingcapacity'],
  },
  {
    key: 'uibc',
    display: 'UIBC',
    panel: 'renalIron',
    synonyms: ['uibc', 'unsaturatedironbindingcapacity'],
  },
  {
    key: 'esr',
    display: 'ESR',
    panel: 'inflammation',
    synonyms: ['esr', 'erythrocytesedimentationrate', 'sedimentationrate'],
  },
];

const CANONICAL_LOOKUP = buildCanonicalLookup(CANONICAL_TESTS);

export default function AiDocPane() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetForThread = useAidocStore(s => s.resetForThread);

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
    if (sessionStorage.getItem('aidoc_booted')) return;
    sessionStorage.setItem('aidoc_booted', '1');
    fetch('/api/aidoc/message', { method: 'POST', body: JSON.stringify({ threadId, op: 'boot' }) });
  }, [threadId, resetForThread]);

  const { data: timelineData, isLoading: timelineLoading, error: timelineError } = useTimeline(true);
  const { data: profileData, isLoading: profileLoading } = useProfile();

  const processed = useMemo<TimelineDisplay>(() => buildTimelineDisplay(timelineData?.items ?? []), [timelineData?.items]);

  const [openingFileKey, setOpeningFileKey] = useState<string | null>(null);

  const handleViewReport = useCallback(
    async (file: ObservationFileRefWithLabel) => {
      const key = file.key;
      const qs = buildFileQuery(file);
      if (!qs) {
        pushToast({ title: 'Unable to open report', description: 'This report does not have a downloadable file.' });
        return;
      }
      try {
        setOpeningFileKey(key);
        const res = await fetch(`/api/uploads/signed-url${qs}`);
        const data = await res.json().catch(() => ({}));
        const url = data?.url;
        if (typeof url === 'string' && url) {
          window.open(url, '_blank', 'noopener,noreferrer');
        } else {
          pushToast({ title: 'Unable to open report', description: 'No download link was returned for this file.' });
        }
      } catch (err) {
        console.error('aidoc: open report failed', err);
        pushToast({ title: 'Unable to open report', description: 'Please try again in a moment.' });
      } finally {
        setOpeningFileKey(prev => (prev === key ? null : prev));
      }
    },
    []
  );

  const handleDiscuss = useCallback(
    (isoDate: string) => {
      if (!threadId) {
        pushToast({ title: 'Chat not ready', description: 'The AI Doc chat thread is still initializing.' });
        return;
      }
      const params = new URLSearchParams({ panel: 'ai-doc', threadId, context: 'chat', focus: 'composer', date: isoDate });
      router.push(`?${params.toString()}`);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('aidoc-discuss-report', {
            detail: { threadId, date: isoDate },
          })
        );
      }
    },
    [router, threadId]
  );

  const loading = timelineLoading || profileLoading;
  const hasObservations = processed.days.length > 0;

  const profileLine = buildProfileLine(profileData?.profile ?? null);

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-white text-slate-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="space-y-6 p-4 sm:p-6">
        {profileLine && (
          <section aria-label="Patient profile" className="space-y-1">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Profile</h2>
            <div className="text-lg font-semibold">
              <span className="hidden sm:inline">{profileLine.wide}</span>
              <span className="block sm:hidden">
                <span>{profileLine.name}</span>
                {profileLine.narrow && (
                  <span className="mt-0.5 text-sm font-normal text-slate-600 dark:text-slate-300">{profileLine.narrow}</span>
                )}
              </span>
            </div>
          </section>
        )}

        <section aria-label="Report summary" className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Summary</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <div className="font-medium text-slate-700 dark:text-slate-200">
              Total reports: <span className="font-semibold text-slate-900 dark:text-white">{processed.summary.totalReports}</span>
            </div>
            <div className="font-medium text-slate-700 dark:text-slate-200">
              Last upload:{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                {processed.summary.lastUploadLabel ?? '—'}
              </span>
            </div>
            {processed.summary.breakdown.length > 0 && (
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-slate-700 dark:text-slate-200">
                <span className="font-medium">Breakdown:</span>
                <span>
                  {processed.summary.breakdown.map((entry, idx) => (
                    <Fragment key={entry.label}>
                      {idx > 0 && <span className="text-slate-400"> • </span>}
                      <span className="font-medium text-slate-900 dark:text-white">{entry.label}</span>
                      <span className="text-slate-700 dark:text-slate-200"> {entry.count}</span>
                    </Fragment>
                  ))}
                </span>
              </div>
            )}
          </div>
        </section>

        {loading && !hasObservations ? <PanelLoader label="Pulling your reports…" /> : null}

        {!loading && timelineError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            Couldn’t load reports right now. Please refresh to try again.
          </div>
        ) : null}

        {!loading && !timelineError && !hasObservations ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
            <p className="font-medium">No reports yet.</p>
            <p className="mt-2">Upload a lab, prescription, or discharge summary to let AI Doc review it.</p>
            <button
              type="button"
              onClick={() => router.push('/?panel=chat&context=upload')}
              className="mt-4 inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              Upload report
            </button>
          </div>
        ) : null}

        {processed.days.map(day => (
          <section
            key={day.isoDate}
            aria-label={`Reports from ${day.displayDate}`}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-zinc-900 sm:p-5"
          >
            <div className="space-y-4">
              <header>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{day.displayDate}</h3>
              </header>

              {day.highlights.length > 0 && (
                <div className="space-y-1" aria-label="Highlights">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Highlights
                  </div>
                  <div className="text-sm leading-6 text-slate-800 dark:text-slate-200">
                    {day.highlights.map((text, idx) => (
                      <Fragment key={text}>
                        {idx > 0 && <span className="text-slate-400">, </span>}
                        <span>{text}</span>
                      </Fragment>
                    ))}
                  </div>
                </div>
              )}

              {PANEL_ORDER.map(panelKey => {
                const items = day.panels[panelKey];
                if (!items.length) return null;
                const panelMeta = PANEL_CONFIG[panelKey];
                return (
                  <div key={panelKey} className="space-y-1" aria-label={`${panelMeta.label} panel`}>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {panelMeta.label}
                    </div>
                    <div className="text-sm leading-6 text-slate-800 dark:text-slate-200">
                      {panelMeta.join === 'dot' ? (
                        <PanelItemList items={items} separator="·" />
                      ) : (
                        <PanelItemList items={items} separator="," />
                      )}
                    </div>
                  </div>
                );
              })}

              {day.files.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1" aria-label="Report actions">
                  {day.files.map((file, index) => (
                    <button
                      key={file.key}
                      type="button"
                      onClick={() => handleViewReport(file)}
                      className="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                      disabled={openingFileKey === file.key}
                    >
                      {openingFileKey === file.key ? 'Opening…' : `View report${day.files.length > 1 ? ` ${index + 1}` : ''}`}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleDiscuss(day.isoDate)}
                    className="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    Discuss in chat
                  </button>
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function PanelItemList({ items, separator }: { items: NormalizedObservation[]; separator: '·' | ',' }) {
  return (
    <div className="flex flex-wrap gap-y-1" role="list">
      {items.map((item, index) => (
        <Fragment key={`${item.canonicalKey}-${index}`}>
          {index > 0 && (
            <span className="mx-1 text-slate-400" aria-hidden="true">
              {separator}
            </span>
          )}
          <span role="listitem" className="text-sm leading-6 text-slate-800 dark:text-slate-200">
            <PanelValue item={item} />
          </span>
        </Fragment>
      ))}
    </div>
  );
}

function PanelValue({ item }: { item: NormalizedObservation }) {
  const marker = item.marker;
  const highlightTone = marker ? (marker.code.startsWith('H') ? 'text-rose-600 dark:text-rose-400' : 'text-sky-600 dark:text-sky-400') : '';
  return (
    <span className="inline">
      <span className="font-semibold text-slate-900 dark:text-slate-100">{item.shortLabel}</span>{' '}
      <span className="tabular-nums">{item.value}</span>
      {item.unit ? <span className="ml-1 uppercase tracking-tight text-slate-700 dark:text-slate-300">{item.unit}</span> : null}
      {marker ? (
        <span className={`ml-1 font-semibold ${highlightTone}`}>
          ({marker.code})
          <span className="ml-1 font-medium">– {marker.label}</span>
        </span>
      ) : null}
    </span>
  );
}

function buildTimelineDisplay(items: any[]): TimelineDisplay {
  const observations: RawObservation[] = (items || []).filter((it: any) => (it?.kind || '').toLowerCase() !== 'prediction');
  const dayMap = new Map<string, {
    date: Date;
    displayDate: string;
    highlights: Set<string>;
    panels: Record<PanelKey, NormalizedObservation[]>;
    seen: Set<string>;
    files: Map<string, ObservationFileRefWithLabel>;
  }>();
  const sources = new Map<string, { type: string }>();
  let latestDate: Date | null = null;

  for (const raw of observations) {
    const normalized = normalizeObservation(raw);
    if (!normalized) continue;
    const observedAt = parseDate(raw.observed_at);
    if (!observedAt) continue;

    if (!latestDate || observedAt.getTime() > latestDate.getTime()) {
      latestDate = observedAt;
    }

    const isoDate = observedAt.toISOString().slice(0, 10);
    if (!dayMap.has(isoDate)) {
      dayMap.set(isoDate, {
        date: observedAt,
        displayDate: formatDisplayDate(observedAt),
        highlights: new Set(),
        panels: {
          liver: [],
          glucose: [],
          lipids: [],
          renalIron: [],
          inflammation: [],
          other: [],
        },
        seen: new Set(),
        files: new Map(),
      });
    }
    const entry = dayMap.get(isoDate)!;

    const dedupKey = `${normalized.canonicalKey}|${normalized.value}|${normalized.unit ?? ''}|${normalized.marker?.code ?? ''}`;
    if (entry.seen.has(dedupKey)) continue;
    entry.seen.add(dedupKey);

    entry.panels[normalized.panel].push(normalized);
    if (normalized.marker) {
      entry.highlights.add(`${normalized.highlightLabel} (${normalized.marker.code})`);
    }

    const fileKey = buildFileKey(raw.file);
    if (fileKey) {
      entry.files.set(fileKey, {
        ...(raw.file ?? {}),
        key: fileKey,
        label: raw.file?.name || normalized.displayName,
      });
    }

    const sourceId = extractSourceId(raw);
    if (!sources.has(sourceId)) {
      sources.set(sourceId, { type: deriveReportType(raw) });
    }
  }

  const days = Array.from(dayMap.values())
    .map(day => {
      PANEL_ORDER.forEach(panelKey => {
        day.panels[panelKey].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
      });
      return {
        isoDate: day.date.toISOString().slice(0, 10),
        date: day.date,
        displayDate: day.displayDate,
        highlights: Array.from(day.highlights).sort((a, b) => a.localeCompare(b)),
        panels: day.panels,
        files: Array.from(day.files.values()),
      } as TimelineDay;
    })
    .filter(day => PANEL_ORDER.some(panelKey => day.panels[panelKey].length > 0))
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  const totalReports = sources.size;
  const breakdownCounts = new Map<string, number>();
  sources.forEach(({ type }) => {
    const key = type || 'Other';
    breakdownCounts.set(key, (breakdownCounts.get(key) ?? 0) + 1);
  });

  const breakdown = Array.from(breakdownCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));

  return {
    days,
    summary: {
      totalReports,
      lastUploadLabel: latestDate ? formatDisplayDate(latestDate) : null,
      breakdown,
    },
  };
}

function normalizeObservation(raw: RawObservation): NormalizedObservation | null {
  const valueInfo = extractValue(raw);
  if (!valueInfo) return null;
  const meta = raw.meta ?? {};
  const nameCandidates = [
    meta.canonicalName,
    meta.canonical_label,
    meta.normalizedName,
    meta.normalized_name,
    meta.analyte,
    meta.analyteName,
    meta.test_name,
    meta.testName,
    meta.display_name,
    raw.name_display,
    raw.name,
    meta.label,
    meta.name,
    meta.short_name,
    meta.long_name,
    meta.title,
    raw.kind,
  ];

  const canonical = findCanonical(nameCandidates);
  const fallbackName = cleanLabel(firstNonEmptyString(nameCandidates) || 'Observation');
  const displayName = canonical?.display ?? fallbackName;
  const highlightLabel = canonical?.highlight ?? canonical?.display ?? displayName;
  const shortLabel = canonical?.short ?? canonical?.display ?? displayName;
  const panel: PanelKey = canonical?.panel ?? 'other';
  const marker = extractMarker(raw.flags, meta);
  const canonicalKey = canonical?.key ?? (normalizeKey(displayName) || raw.id || displayName);

  return {
    canonicalKey,
    displayName,
    shortLabel,
    highlightLabel,
    panel,
    value: valueInfo.value,
    unit: valueInfo.unit,
    marker,
    sortKey: displayName.toLowerCase(),
    raw,
  };
}

function extractMarker(flags: unknown, meta: Record<string, any>): Marker | null {
  const values: string[] = [];
  const push = (value: unknown) => {
    if (typeof value === 'string' && value.trim()) values.push(value.trim());
  };
  if (Array.isArray(flags)) flags.forEach(push);
  else push(flags);
  ['flag', 'abnormal', 'abnormalFlag', 'flag_code', 'marker', 'level', 'abnormal_level'].forEach(key => push(meta?.[key]));

  if (!values.length) return null;
  const normalized = values.map(v => v.toLowerCase());

  const veryHigh = normalized.find(v => /hh|very[_\s-]?high|critical[_\s-]?high|dangerously[_\s-]?high|critical_h/.test(v));
  if (veryHigh) return { code: 'HH', label: 'Very high' };
  const veryLow = normalized.find(v => /ll|very[_\s-]?low|critical[_\s-]?low|dangerously[_\s-]?low|critical_l/.test(v));
  if (veryLow) return { code: 'LL', label: 'Very low' };
  const high = normalized.find(v => /\bhigh\b|^h$|elevated|above|raised|\u2191/.test(v));
  if (high) return { code: 'H', label: 'High' };
  const low = normalized.find(v => /\blow\b|^l$|decreased|below|reduced|\u2193/.test(v));
  if (low) return { code: 'L', label: 'Low' };
  return null;
}

function extractValue(raw: RawObservation): { value: string; unit: string | null } | null {
  const meta = raw.meta ?? {};
  const numberCandidates = [raw.value_num, meta.value_num, meta.numericValue, meta.result_num];
  let numeric: number | null = null;
  for (const candidate of numberCandidates) {
    if (typeof candidate === 'number' && isFinite(candidate)) {
      numeric = candidate;
      break;
    }
  }

  const textCandidates = [raw.value_text, meta.value_text, meta.result_text, meta.summary, meta.summary_display, meta.text];
  let text: string | null = null;
  for (const candidate of textCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      text = candidate.trim();
      break;
    }
  }

  if (numeric == null && !text) return null;

  let value = '';
  if (numeric != null) {
    const abs = Math.abs(numeric);
    let maximumFractionDigits = 2;
    if (abs >= 1000) maximumFractionDigits = 0;
    else if (abs >= 100) maximumFractionDigits = 1;
    else if (abs < 10) maximumFractionDigits = 3;
    const minimumFractionDigits = numeric % 1 === 0 ? 0 : Math.min(2, maximumFractionDigits);
    value = numeric.toLocaleString(undefined, {
      maximumFractionDigits,
      minimumFractionDigits,
    });
  }
  if (!value && text) value = text;

  if (!value) return null;

  const unitCandidates = [raw.unit, meta.unit, meta.units, meta.uom];
  let unit: string | null = null;
  for (const candidate of unitCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      unit = normalizeUnit(candidate);
      break;
    }
  }

  if (unit && value.toLowerCase().includes(unit.toLowerCase())) {
    unit = null;
  }

  return { value, unit };
}

function normalizeUnit(unit: string) {
  return unit.trim().replace(/\s+/g, ' ');
}

function buildProfileLine(profile: any | null):
  | { name: string; narrow: string | null; wide: string; }
  | null {
  if (!profile) return null;
  const name = titleCase(profile?.full_name ?? '');
  const age = formatAge(profile?.dob);
  const blood = formatBloodGroup(profile?.blood_group);
  const parts = [name, age, blood].filter(Boolean) as string[];
  if (!parts.length) return null;
  const attrParts = [age, blood].filter(Boolean) as string[];
  return {
    name,
    narrow: attrParts.length ? attrParts.join(' • ') : null,
    wide: parts.join(' • '),
  };
}

function formatAge(dob?: string | null): string | null {
  if (!dob) return null;
  const date = new Date(dob);
  if (!isFinite(date.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - date.getFullYear();
  const monthDiff = now.getMonth() - date.getMonth();
  const dayDiff = now.getDate() - date.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    years -= 1;
  }
  if (years >= 2) {
    return `${years} yrs`;
  }
  const months = Math.max(0, years * 12 + monthDiff - (dayDiff < 0 ? 1 : 0));
  return `${months} mos`;
}

function formatBloodGroup(group?: string | null): string | null {
  if (!group) return null;
  const trimmed = String(group).trim();
  if (!trimmed) return null;
  return trimmed.toUpperCase();
}

function titleCase(value: string): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .replace(/(^|[\s-])([a-z])/g, (_, sep: string, letter: string) => `${sep}${letter.toUpperCase()}`)
    .replace(/\b(I|Ii|Iii|Iv|Vi|Vii|Viii|Ix|Xi)\b/g, match => match.toUpperCase());
}

function buildCanonicalLookup(configs: CanonicalConfig[]) {
  const map = new Map<string, CanonicalConfig>();
  configs.forEach(cfg => {
    const names = new Set<string>();
    names.add(cfg.key);
    names.add(cfg.display);
    if (cfg.short) names.add(cfg.short);
    cfg.synonyms.forEach(s => names.add(s));
    names.forEach(name => {
      const key = normalizeKey(name);
      if (key) map.set(key, cfg);
    });
  });
  return map;
}

function normalizeKey(value?: string | null): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9+]+/g, '');
}

function findCanonical(candidates: Array<string | null | undefined>): CanonicalConfig | null {
  for (const candidate of candidates) {
    const key = normalizeKey(candidate);
    if (!key) continue;
    const config = CANONICAL_LOOKUP.get(key);
    if (config) return config;
  }
  return null;
}

function firstNonEmptyString(values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function cleanLabel(label: string): string {
  return label
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/(^|\s)([a-z])/g, (_, space: string, letter: string) => `${space}${letter.toUpperCase()}`);
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (!isFinite(date.getTime())) return null;
  return date;
}

function formatDisplayDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function buildFileKey(file?: ObservationFileRef | null): string | null {
  if (!file) return null;
  if (file.upload_id) return `upload:${file.upload_id}`;
  if (file.bucket && file.path) return `storage:${file.bucket}:${file.path}`;
  return null;
}

function buildFileQuery(file: ObservationFileRefWithLabel): string | null {
  if (file.upload_id) return `?uploadId=${encodeURIComponent(file.upload_id)}`;
  if (file.bucket && file.path) {
    return `?bucket=${encodeURIComponent(file.bucket)}&path=${encodeURIComponent(file.path)}`;
  }
  return null;
}

function extractSourceId(raw: RawObservation): string {
  const meta = raw.meta ?? {};
  return (
    raw.file?.upload_id ||
    meta.upload_id ||
    meta.source_upload_id ||
    meta.document_id ||
    meta.report_id ||
    meta.source_hash ||
    meta.order_id ||
    meta.note_id ||
    `${raw.id ?? ''}|${raw.observed_at ?? ''}`
  );
}

function deriveReportType(raw: RawObservation): string {
  const kind = String(raw.kind ?? '').toLowerCase();
  const meta = raw.meta ?? {};
  const category = String(meta.category ?? '').toLowerCase();
  const docType = String(meta.document_type ?? meta.documentType ?? '').toLowerCase();
  const label = String(meta.label ?? meta.title ?? raw.name ?? '').toLowerCase();
  const typeFrom = (value: string) => {
    if (!value) return '';
    if (value.includes('discharge')) return 'Discharge summaries';
    if (value.includes('prescription') || value.includes('medication') || value.includes('drug') || value.includes('rx')) {
      return 'Prescriptions';
    }
    if (value.includes('lab') || value.includes('test') || value.includes('blood')) return 'Labs';
    if (value.includes('imaging') || value.includes('radiology') || value.includes('scan') || value.includes('mri') || value.includes('ct') || value.includes('xray') || value.includes('ultrasound')) {
      return 'Imaging';
    }
    if (value.includes('note')) return 'Notes';
    return '';
  };

  return (
    typeFrom(kind) ||
    typeFrom(category) ||
    typeFrom(docType) ||
    typeFrom(label) ||
    'Other'
  );
}
