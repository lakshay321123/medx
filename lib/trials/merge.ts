import { TrialRecord } from "./types";

export function dedupeTrials(lists: TrialRecord[][]): TrialRecord[] {
  const out: Record<string, TrialRecord> = {};
  const seenKeys = new Set<string>();

  const keyOf = (t: TrialRecord) => (
    t.ids.nct?.toUpperCase()
    || t.ids.ctri?.toUpperCase()
    || t.ids.euctr?.toUpperCase()
    || t.ids.isrctn?.toUpperCase()
    || null
  );

  const norm = (s?: string) => (s || "").toLowerCase().replace(/\s+/g," ").trim();

  function merge(a: TrialRecord, b: TrialRecord): TrialRecord {
    return {
      ids: { ...a.ids, ...b.ids },
      title: a.title.length >= b.title.length ? a.title : b.title,
      condition: Array.from(new Set([...(a.condition||[]), ...(b.condition||[])])),
      phase: a.phase || b.phase,
      status: a.status || b.status,
      interventions: Array.from(new Set([...(a.interventions||[]), ...(b.interventions||[])])),
      primaryOutcome: a.primaryOutcome || b.primaryOutcome,
      locations: [...(a.locations||[]), ...(b.locations||[])],
      startDate: a.startDate || b.startDate,
      lastUpdated: a.lastUpdated || b.lastUpdated,
      sources: [...a.sources, ...b.sources],
      publications: [...(a.publications || []), ...(b.publications || [])]
    };
  }

  // 1) ID-based merge
  for (const list of lists) for (const t of list) {
    const k = keyOf(t);
    if (k) {
      if (!out[k]) out[k] = t;
      else out[k] = merge(out[k], t);
      seenKeys.add(k);
    }
  }

  // 2) Fallback fuzzy (no IDs): title+phase+country signature
  for (const list of lists) for (const t of list) {
    const k = keyOf(t);
    if (k) continue;
    const sig = `${norm(t.title)}|${t.phase||""}|${(t.locations||[]).map(l=>l.country).join(",")}`;
    if (!out[sig]) out[sig] = t;
    else out[sig] = merge(out[sig], t);
  }

  return Object.values(out);
}
